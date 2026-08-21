import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { kpiPoolClient, type PoolRecord } from "../clients/kpi-pool.client.js";
import { prisma } from "../config/prisma.js";
import type { CreateScorecardBody, ListScorecardsQuery, UpdateScorecardBody } from "../schemas/scorecard.schema.js";
import { AppError } from "../utils/app-error.js";
import { normalizeAreaScope } from "../utils/scorecard-code.js";
import { allocateScorecardCode } from "./scorecard-code.service.js";

const include = { companies: { orderBy: { displayOrder: "asc" as const } }, departments: { include: { employees: true }, orderBy: { displayOrder: "asc" as const } }, periodCompositions: { include: { _count: { select: { kpis: true, links: true } } }, orderBy: { periodStart: "asc" as const } } };
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

type ScorecardRow = Prisma.ScorecardGetPayload<{ include: typeof include }>;
type PoolPeriodRow = { kpiPoolExternalId: bigint; periodKey: string; periodStart: Date; compositionStatusCode: string };
function currentComposition(value: ScorecardRow, poolPeriods: PoolPeriodRow[]) {
  const preparing = value.periodCompositions.find((composition) => composition.statusCode === "PREPARING");
  if (preparing) {
    const previous = [...value.periodCompositions].reverse().find((composition) => composition.statusCode === "FINALIZED" && composition.periodStart < preparing.periodStart);
    return { periodKey: preparing.periodKey, status: "PREPARING", kpisSelected: preparing._count.kpis, linkedScorecards: preparing._count.links, previous: previous ? { periodKey: previous.periodKey, status: "FINALIZED" } : null };
  }
  const represented = new Set(value.periodCompositions.map((composition) => composition.periodKey));
  const available = poolPeriods.find((period) => period.compositionStatusCode === "FINALIZED" && !represented.has(period.periodKey));
  if (available) return { periodKey: available.periodKey, status: "NOT_STARTED", kpisSelected: 0, linkedScorecards: 0, previous: value.periodCompositions.filter((composition) => composition.statusCode === "FINALIZED").at(-1) ? { periodKey: value.periodCompositions.filter((composition) => composition.statusCode === "FINALIZED").at(-1)!.periodKey, status: "FINALIZED" } : null };
  const latest = value.periodCompositions.filter((composition) => composition.statusCode === "FINALIZED").at(-1);
  return latest ? { periodKey: latest.periodKey, status: "FINALIZED", kpisSelected: latest._count.kpis, linkedScorecards: latest._count.links, previous: null } : null;
}
function periodCount(validFrom: Date, validTo: Date, frequencyCode: string) {
  const months = { MONTHLY: 1, QUARTERLY: 3, FOUR_MONTHLY: 4, CUATRIMESTRAL: 4, SEMIANNUAL: 6, ANNUAL: 12 }[frequencyCode] ?? 1;
  return Math.ceil(((validTo.getUTCFullYear() - validFrom.getUTCFullYear()) * 12 + validTo.getUTCMonth() - validFrom.getUTCMonth() + 1) / months);
}
function dto(value: ScorecardRow, pool?: { validFrom: Date; validTo: Date; inputFrequencyCode: string } | null, poolPeriods: PoolPeriodRow[] = []) {
  return { id: value.id.toString(), code: value.code, name: value.name, description: value.description, status: value.statusCode, kpiPool: { id: value.kpiPoolExternalId.toString(), code: value.poolCodeSnapshot, name: value.poolNameSnapshot }, poolSchedule: pool ? { validFrom: dateOnly(pool.validFrom), validTo: dateOnly(pool.validTo), inputFrequencyCode: pool.inputFrequencyCode, inputPeriods: periodCount(pool.validFrom, pool.validTo, pool.inputFrequencyCode) } : null, currentComposition: currentComposition(value, poolPeriods), companies: value.companies.map((item) => ({ id: item.externalCompanyId.toString(), code: item.companyCodeSnapshot, name: item.companyNameSnapshot })), departments: value.departments.map((item) => ({ id: item.externalDepartmentId.toString(), code: item.departmentCodeSnapshot, name: item.departmentNameSnapshot, collaborators: item.employees.map((employee) => ({ id: employee.externalEmployeeId.toString(), code: employee.employeeCodeSnapshot, name: employee.employeeNameSnapshot })) })), periodCompositionCount: value.periodCompositions.length, createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt?.toISOString() ?? null };
}
function validateScope(input: Pick<CreateScorecardBody, "departments" | "collaborators">, pool: PoolRecord) {
  const companyIds = new Set(pool.companies.map((company) => company.id));
  const departmentIds = new Set(input.departments.map((department) => department.externalDepartmentId));
  const invalidDepartments = input.departments.filter((department) => !companyIds.has(department.companyExternalId));
  if (invalidDepartments.length) throw new AppError(422, "DEPARTMENT_OUTSIDE_POOL_SCOPE", "One or more Departments belong to a Company outside the KPI Pool scope", { departmentIds: invalidDepartments.map((item) => item.externalDepartmentId) });
  const invalidCollaborators = input.collaborators.filter((collaborator) => !departmentIds.has(collaborator.departmentExternalId));
  if (invalidCollaborators.length) throw new AppError(422, "COLLABORATOR_OUTSIDE_DEPARTMENT_SCOPE", "One or more Collaborators do not belong to a selected Department", { collaboratorIds: invalidCollaborators.map((item) => item.externalEmployeeId) });
}
async function activePool(id: string) { const pool = await kpiPoolClient.getPool(id); if (pool.status !== "ACTIVE") throw new AppError(422, "KPI_POOL_NOT_ACTIVE", "The selected KPI Pool must be ACTIVE"); return pool; }
function scopeRows(input: Pick<CreateScorecardBody, "departments" | "collaborators">, actor: bigint) {
  return input.departments.map((department, index) => ({ externalDepartmentId: BigInt(department.externalDepartmentId), externalCompanyId: BigInt(department.companyExternalId), departmentCodeSnapshot: department.code, departmentNameSnapshot: department.name, displayOrder: index + 1, createdByUserId: actor, employees: { create: input.collaborators.filter((employee) => employee.departmentExternalId === department.externalDepartmentId).map((employee) => ({ externalEmployeeId: BigInt(employee.externalEmployeeId), employeeCodeSnapshot: employee.code, employeeNameSnapshot: employee.name, createdByUserId: actor })) } }));
}
async function outbox(tx: Prisma.TransactionClient, scorecard: { id: bigint; aggregateVersion: number }, eventType: string, data: Prisma.InputJsonObject) { const eventId = randomUUID(); const occurredAt = new Date(); const payload: Prisma.InputJsonObject = { eventId, eventType, occurredAt: occurredAt.toISOString(), producer: "exa-scorecards-service", aggregateType: "scorecard", aggregateId: scorecard.id.toString(), version: scorecard.aggregateVersion, data }; await tx.outboxEvent.create({ data: { eventId, eventType, aggregateType: "scorecard", aggregateId: scorecard.id.toString(), aggregateVersion: scorecard.aggregateVersion, subject: eventType, payload, occurredAt } }); return eventId; }

export const scorecardService = {
  async list(query: ListScorecardsQuery) {
    const scheduleFilters = query.frequency?.length || query.year?.length ? await prisma.poolReference.findMany({ where: { ...(query.frequency?.length ? { inputFrequencyCode: { in: query.frequency } } : {}), ...(query.year?.length ? { OR: query.year.map((year) => ({ validFrom: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } })) } : {}) }, select: { kpiPoolExternalId: true } }) : null;
    const schedulePoolIds = scheduleFilters?.map((pool) => pool.kpiPoolExternalId);
    const requestedPoolIds = query.poolId?.map(BigInt);
    const effectivePoolIds = schedulePoolIds && requestedPoolIds ? schedulePoolIds.filter((id) => requestedPoolIds.includes(id)) : schedulePoolIds ?? requestedPoolIds;
    const where: Prisma.ScorecardWhereInput = { deletedAt: null, ...(query.search ? { OR: [{ code: { contains: query.search } }, { name: { contains: query.search } }, { poolCodeSnapshot: { contains: query.search } }, { poolNameSnapshot: { contains: query.search } }] } : {}), ...(query.status?.length ? { statusCode: { in: query.status } } : {}), ...(effectivePoolIds ? { kpiPoolExternalId: { in: effectivePoolIds } } : {}), ...(query.companyId?.length ? { companies: { some: { externalCompanyId: { in: query.companyId.map(BigInt) } } } } : {}), ...(query.department?.length ? { departments: { some: { departmentNameSnapshot: { in: query.department } } } } : {}) };
    const skip = (query.page - 1) * query.pageSize;
    const sortField = { scorecardCode: "code", scorecardName: "name", statusCode: "statusCode", createdAt: "createdAt", updatedAt: "updatedAt" }[query.sortBy];
    const [rows, totalItems] = await prisma.$transaction([prisma.scorecard.findMany({ where, include, orderBy: { [sortField]: query.sortOrder }, skip, take: query.pageSize }), prisma.scorecard.count({ where })]);
    const poolIds = [...new Set(rows.map((row) => row.kpiPoolExternalId))];
    const [pools, poolPeriods] = await Promise.all([prisma.poolReference.findMany({ where: { kpiPoolExternalId: { in: poolIds } } }), prisma.poolPeriodReference.findMany({ where: { kpiPoolExternalId: { in: poolIds }, compositionStatusCode: "FINALIZED" }, orderBy: { periodStart: "asc" } })]);
    const byPool = new Map(pools.map((pool) => [pool.kpiPoolExternalId.toString(), pool]));
    return { data: rows.map((row) => dto(row, byPool.get(row.kpiPoolExternalId.toString()), poolPeriods.filter((period) => period.kpiPoolExternalId === row.kpiPoolExternalId))), meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
  },
  async get(id: bigint) { const row = await prisma.scorecard.findFirst({ where: { id, deletedAt: null }, include }); if (!row) throw new AppError(404, "SCORECARD_NOT_FOUND", "Scorecard was not found"); const [pool, poolPeriods] = await Promise.all([prisma.poolReference.findUnique({ where: { kpiPoolExternalId: row.kpiPoolExternalId } }), prisma.poolPeriodReference.findMany({ where: { kpiPoolExternalId: row.kpiPoolExternalId, compositionStatusCode: "FINALIZED" }, orderBy: { periodStart: "asc" } })]); return dto(row, pool, poolPeriods); },
  async create(input: CreateScorecardBody, actor: bigint) {
    const pool = await activePool(input.kpiPoolExternalId); validateScope(input, pool);
    return prisma.$transaction(async (tx) => {
      const primaryArea = pool.areas[0]; if (!primaryArea) throw new AppError(422, "KPI_POOL_AREA_SCOPE_MISSING", "The selected KPI Pool has no Area scope for Scorecard code generation");
      const scopeKey = normalizeAreaScope([primaryArea.code]); const generated = await allocateScorecardCode(tx, scopeKey, pool.issueYear);
      const row = await tx.scorecard.create({ data: { code: generated.code, name: input.name, description: input.description ?? null, kpiPoolExternalId: BigInt(pool.id), poolCodeSnapshot: pool.poolCode, poolNameSnapshot: pool.poolName, createdByUserId: actor, companies: { create: pool.companies.map((company, index) => ({ externalCompanyId: BigInt(company.id), companyCodeSnapshot: company.code, companyNameSnapshot: company.name, displayOrder: index + 1, createdByUserId: actor })) }, departments: { create: scopeRows(input, actor) } }, include });
      await outbox(tx, row, "scorecard.created.v1", { scorecardCode: row.code, kpiPoolExternalId: pool.id, status: row.statusCode }); return dto(row);
    });
  },
  async update(id: bigint, input: UpdateScorecardBody, actor: bigint) {
    const current = await prisma.scorecard.findFirst({ where: { id, deletedAt: null } }); if (!current) throw new AppError(404, "SCORECARD_NOT_FOUND", "Scorecard was not found"); if (current.statusCode === "INACTIVE") throw new AppError(409, "SCORECARD_INACTIVE", "An INACTIVE Scorecard cannot be edited");
    const pool = await activePool(current.kpiPoolExternalId.toString());
    const existing = await prisma.scorecardDepartmentScope.findMany({ where: { scorecardId: id }, include: { employees: true } });
    const scope = { departments: input.departments ?? existing.map((item) => ({ externalDepartmentId: item.externalDepartmentId.toString(), companyExternalId: item.externalCompanyId.toString(), code: item.departmentCodeSnapshot, name: item.departmentNameSnapshot })), collaborators: input.collaborators ?? existing.flatMap((item) => item.employees.map((employee) => ({ externalEmployeeId: employee.externalEmployeeId.toString(), departmentExternalId: item.externalDepartmentId.toString(), code: employee.employeeCodeSnapshot, name: employee.employeeNameSnapshot }))) }; validateScope(scope, pool);
    return prisma.$transaction(async (tx) => { await tx.scorecard.update({ where: { id }, data: { name: input.name, description: input.description, aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } }); if (input.departments || input.collaborators) { await tx.scorecardDepartmentScope.deleteMany({ where: { scorecardId: id } }); for (const department of scopeRows(scope, actor)) await tx.scorecardDepartmentScope.create({ data: { ...department, scorecardId: id } }); } return dto(await tx.scorecard.findUniqueOrThrow({ where: { id }, include })); });
  },
  async deactivate(id: bigint, actor: bigint) { return prisma.$transaction(async (tx) => { const updated = await tx.scorecard.updateMany({ where: { id, deletedAt: null, statusCode: { in: ["DRAFT", "ACTIVE"] } }, data: { statusCode: "INACTIVE", aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } }); if (!updated.count) throw new AppError(409, "SCORECARD_DEACTIVATION_CONFLICT", "Scorecard is missing or already INACTIVE"); const row = await tx.scorecard.findUniqueOrThrow({ where: { id }, include }); await outbox(tx, row, "scorecard.deactivated.v1", { scorecardCode: row.code }); return dto(row); }); },
};

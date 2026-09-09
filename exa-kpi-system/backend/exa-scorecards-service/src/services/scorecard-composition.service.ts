import { isIndividualEvaluation } from "../contracts/entity-participation.js";
import { freezeWeightedSettings, entityWeights, type EntityWeight } from "../contracts/evaluation-weights.js";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const include = {
  kpis: { orderBy: { displayOrder: "asc" as const } },
  links: { include: { linkedScorecard: { include: { companies: { orderBy: { displayOrder: "asc" as const } }, departments: { orderBy: { displayOrder: "asc" as const } } } } }, orderBy: { displayOrder: "asc" as const } },
  scopeDepartments: { include: { employees: true }, orderBy: { displayOrder: "asc" as const } },
};
type FullComposition = Prisma.ScorecardPeriodCompositionGetPayload<{ include: typeof include }>;

async function scorecard(id: bigint) {
  const value = await prisma.scorecard.findFirst({ where: { id, deletedAt: null } });
  if (!value) throw new AppError(404, "SCORECARD_NOT_FOUND", "Scorecard was not found");
  return value;
}

async function finalizedPeriod(poolId: bigint, periodKey: string) {
  let value = await prisma.poolPeriodReference.findFirst({
    where: { kpiPoolExternalId: poolId, periodKey, compositionStatusCode: "FINALIZED" },
    include: { memberships: { orderBy: { displayOrder: "asc" } } },
  });
  const displayMetadataMissing = value?.memberships.length && value.memberships.every((row) => row.categoryName === null && row.goalSnapshot === null && row.dataSourceSnapshot === null && row.measurementUnitSnapshot === null);
  const measurementUnitMissing = value?.memberships.length && value.memberships.every((row) => row.measurementUnitSnapshot === null);
  if (!value?.poolPeriodExternalId || !value.poolCompositionExternalId || value.memberships.length === 0 || displayMetadataMissing || measurementUnitMissing) {
    const sourcePeriod = (await kpiPoolClient.periods(poolId.toString())).find((period) => period.periodKey === periodKey);
    if (sourcePeriod?.poolPeriodId && sourcePeriod.poolCompositionId) {
      const memberships = await kpiPoolClient.memberships(poolId.toString(), sourcePeriod.start);
      if (!memberships.length) throw new AppError(503, "POOL_COMPOSITION_PROJECTION_UNAVAILABLE", "The finalized KPI Pool Composition has no memberships available for projection recovery");
      await prisma.$transaction(async (tx) => {
        const period = await tx.poolPeriodReference.upsert({
          where: { kpiPoolExternalId_periodStart: { kpiPoolExternalId: poolId, periodStart: new Date(`${sourcePeriod.start}T00:00:00.000Z`) } },
          create: {
            kpiPoolExternalId: poolId,
            poolPeriodExternalId: BigInt(sourcePeriod.poolPeriodId!),
            poolCompositionExternalId: BigInt(sourcePeriod.poolCompositionId!),
            periodKey: sourcePeriod.periodKey,
            periodStart: new Date(`${sourcePeriod.start}T00:00:00.000Z`),
            periodEnd: new Date(`${sourcePeriod.end}T00:00:00.000Z`),
            compositionStatusCode: "FINALIZED",
            kpiCountSnapshot: memberships.length,
          },
          update: {
            poolPeriodExternalId: BigInt(sourcePeriod.poolPeriodId!),
            poolCompositionExternalId: BigInt(sourcePeriod.poolCompositionId!),
            periodKey: sourcePeriod.periodKey,
            periodEnd: new Date(`${sourcePeriod.end}T00:00:00.000Z`),
            compositionStatusCode: "FINALIZED",
            kpiCountSnapshot: memberships.length,
            syncedAt: new Date(),
          },
        });
        await tx.poolPeriodMembershipReference.deleteMany({ where: { poolPeriodReferenceId: period.id } });
        await tx.poolPeriodMembershipReference.createMany({
          data: memberships.map((membership) => ({
            poolPeriodReferenceId: period.id,
            poolMembershipExternalId: BigInt(membership.membershipId),
            kpiDefinitionExternalId: BigInt(membership.definitionId),
            kpiConfigurationExternalId: BigInt(membership.configurationId),
            definitionCode: membership.definitionCode,
            definitionName: membership.definitionName,
            configurationCode: membership.configCode,
            categoryName: membership.categoryName,
            goalSnapshot: membership.goal,
            dataSourceSnapshot: membership.dataSource,
            measurementUnitSnapshot: membership.measurementUnit,
            displayOrder: membership.displayOrder,
          })),
        });
        for (const membership of memberships) {
          await tx.scorecardPeriodKpi.updateMany({
            where: { kpiPoolMembershipExternalId: BigInt(membership.membershipId), composition: { statusCode: "PREPARING" } },
            data: { categoryNameSnapshot: membership.categoryName, goalSnapshot: membership.goal, dataSourceSnapshot: membership.dataSource, measurementUnitSnapshot: membership.measurementUnit },
          });
        }
      });
      value = await prisma.poolPeriodReference.findFirst({
        where: { kpiPoolExternalId: poolId, periodKey, compositionStatusCode: "FINALIZED" },
        include: { memberships: { orderBy: { displayOrder: "asc" } } },
      });
    }
    if (!sourcePeriod?.poolPeriodId || !sourcePeriod.poolCompositionId) {
      throw new AppError(409, "POOL_COMPOSITION_NOT_FINALIZED", "The KPI Pool Composition is not finalized or its stable contract is unavailable");
    }
  }
  if (!value?.poolPeriodExternalId || !value.poolCompositionExternalId) throw new AppError(503, "POOL_COMPOSITION_PROJECTION_UNAVAILABLE", "The finalized KPI Pool Composition could not be recovered into the local Scorecards projection");
  return value;
}

async function findComposition(scorecardId: bigint, periodKey: string) {
  return prisma.scorecardPeriodComposition.findFirst({ where: { scorecardId, periodKey }, include });
}

async function getOrCreate(owner: Awaited<ReturnType<typeof scorecard>>, period: { periodKey: string; periodStart: Date; periodEnd: Date; poolPeriodExternalId: bigint | null; poolCompositionExternalId: bigint | null }, actor: bigint) {
  const existing = await findComposition(owner.id, period.periodKey);
  if (existing && (existing.scopeCustomizedAt !== null || existing.statusCode === "FINALIZED")) return existing;
  return prisma.$transaction(async (tx) => {
    const previous = await tx.scorecardPeriodComposition.findFirst({ where: { scorecardId: owner.id, periodStart: { lt: period.periodStart }, scopeCustomizedAt: { not: null } }, orderBy: { periodStart: "desc" }, include: { scopeDepartments: { include: { employees: true }, orderBy: { displayOrder: "asc" } } } });
    const base = previous?.scopeDepartments.length ? previous.scopeDepartments : await tx.scorecardDepartmentScope.findMany({ where: { scorecardId: owner.id }, include: { employees: true }, orderBy: { displayOrder: "asc" } });
    if (existing) {
      await tx.scorecardPeriodDepartmentScope.deleteMany({ where: { scorecardPeriodCompositionId: existing.id } });
      for (const [index, department] of base.entries()) await tx.scorecardPeriodDepartmentScope.create({ data: { scorecardPeriodCompositionId: existing.id, externalDepartmentId: department.externalDepartmentId, externalCompanyId: department.externalCompanyId, departmentCodeSnapshot: department.departmentCodeSnapshot, departmentNameSnapshot: department.departmentNameSnapshot, displayOrder: index + 1, createdByUserId: actor, employees: { create: department.employees.map((employee) => ({ externalEmployeeId: employee.externalEmployeeId, employeeCodeSnapshot: employee.employeeCodeSnapshot, employeeNameSnapshot: employee.employeeNameSnapshot, createdByUserId: actor })) } } });
      return (await tx.scorecardPeriodComposition.findUnique({ where: { id: existing.id }, include }))!;
    }
    return tx.scorecardPeriodComposition.create({ data: { scorecardId: owner.id, kpiPoolExternalId: owner.kpiPoolExternalId, poolPeriodExternalId: period.poolPeriodExternalId, poolCompositionExternalId: period.poolCompositionExternalId, periodKey: period.periodKey, periodStart: period.periodStart, periodEnd: period.periodEnd, createdByUserId: actor, scopeDepartments: { create: base.map((department, index) => ({ externalDepartmentId: department.externalDepartmentId, externalCompanyId: department.externalCompanyId, departmentCodeSnapshot: department.departmentCodeSnapshot, departmentNameSnapshot: department.departmentNameSnapshot, displayOrder: index + 1, createdByUserId: actor, employees: { create: department.employees.map((employee) => ({ externalEmployeeId: employee.externalEmployeeId, employeeCodeSnapshot: employee.employeeCodeSnapshot, employeeNameSnapshot: employee.employeeNameSnapshot, createdByUserId: actor })) } })) } }, include });
  });
}

function editable(owner: { statusCode: string }, composition: { statusCode: string }) {
  if (owner.statusCode === "INACTIVE") throw new AppError(409, "SCORECARD_INACTIVE", "An inactive Scorecard cannot be changed");
  if (composition.statusCode !== "PREPARING") throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The Scorecard Composition is read-only");
}
function canPrepare(owner: { statusCode: string }) { if (owner.statusCode === "INACTIVE") throw new AppError(409, "SCORECARD_INACTIVE", "An inactive Scorecard cannot create or change compositions"); }

async function assignmentDto(value: FullComposition, poolId: bigint) {
  const result = dto(value);
  if (value.statusCode === "FINALIZED") return result;
  for (const item of result.kpis) {
    const row = value.kpis.find(row => row.id.toString() === item.id)!;
    const resolved = await kpiPoolClient.effectiveSettings(poolId.toString(), value.poolPeriodExternalId!.toString(), item.kpiConfigurationExternalId);
    item.evaluationScope = resolved.effective.evaluationScope;
    item.evaluations = isIndividualEvaluation(resolved.effective) ? entityWeights(resolved.effective, (row.entityWeights ?? []) as EntityWeight[], false) : [];
    if (resolved.effective.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL") item.goal = resolved.effective.goal;
    item.entityEvaluationMode = resolved.effective.entityEvaluationMode ?? (resolved.effective.evaluationScope === "BY_SUBJECT" ? "INDIVIDUAL" : null);
    item.groupGoal = resolved.effective.groupGoal ?? null;
    item.goalUnit = resolved.effective.goalUnit.symbol;
    item.resultUnit = resolved.effective.measurementUnit.symbol;
  }
  return result;
}
function dto(value: FullComposition) {
  const kpiWeight = value.kpis.reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0));
  const linkWeight = value.links.reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0));
  return {
    id: value.id.toString(), periodKey: value.periodKey, status: value.statusCode,
    periodStart: value.periodStart.toISOString().slice(0, 10), periodEnd: value.periodEnd.toISOString().slice(0, 10),
    poolPeriodExternalId: value.poolPeriodExternalId?.toString() ?? null,
    poolCompositionExternalId: value.poolCompositionExternalId?.toString() ?? null,
    scopeCustomized: value.scopeCustomizedAt !== null,
    scope: { departments: value.scopeDepartments.map((department) => ({ id: department.externalDepartmentId.toString(), code: department.departmentCodeSnapshot, name: department.departmentNameSnapshot, companyId: department.externalCompanyId.toString(), collaborators: department.employees.map((employee) => ({ id: employee.externalEmployeeId.toString(), code: employee.employeeCodeSnapshot, name: employee.employeeNameSnapshot })) })) },
    kpis: value.kpis.map((row) => ({
      id: row.id.toString(), poolMembershipExternalId: row.kpiPoolMembershipExternalId.toString(),
      kpiDefinitionExternalId: row.kpiDefinitionExternalId.toString(), kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(),
      definitionCode: row.definitionCodeSnapshot, definitionName: row.definitionNameSnapshot,
      entityEvaluationMode: (row.effectiveSettingsSnapshot as any)?.entityEvaluationMode ?? ((row.effectiveSettingsSnapshot as any)?.evaluationScope === "BY_SUBJECT" ? "INDIVIDUAL" : null),
      evaluationScope: (row.effectiveSettingsSnapshot as any)?.evaluationScope as string | undefined,
      evaluations: ((row.effectiveSettingsSnapshot as any)?.evaluationWeightsVersion === "EXPLICIT_ENTITY_V1" ? (row.effectiveSettingsSnapshot as any).subjectGoals : []) as Array<{subjectExternalId:string;subjectCode:string|null;subjectLabel:string;goal:string|null;goalUnit?:{symbol:string};resultUnit?:{symbol:string};weight:string|null}>,
      groupGoal: (row.effectiveSettingsSnapshot as any)?.groupGoal ?? null,
      goalUnit: (row.effectiveSettingsSnapshot as any)?.goalUnit?.symbol as string | undefined,
      resultUnit: (row.effectiveSettingsSnapshot as any)?.measurementUnit?.symbol as string | undefined,
      configurationCode: row.configurationCodeSnapshot, categoryName: row.categoryNameSnapshot, goal: row.goalSnapshot,
      dataSource: row.dataSourceSnapshot, measurementUnit: row.measurementUnitSnapshot, weight: row.weightPercent.toFixed(4), displayOrder: row.displayOrder,
    })),
    linkedScorecards: value.links.map((row) => ({
      id: row.id.toString(), linkedScorecardId: row.linkedScorecardId.toString(), code: row.linkedScorecard.code,
      name: row.linkedScorecard.name, status: row.linkedScorecard.statusCode,
      companies: row.linkedScorecard.companies.map((company) => company.companyNameSnapshot),
      departments: row.linkedScorecard.departments.map((department) => department.departmentNameSnapshot),
      weight: row.weightPercent.toFixed(4), displayOrder: row.displayOrder,
    })),
    weights: { kpis: kpiWeight.toFixed(4), linkedScorecards: linkWeight.toFixed(4), total: kpiWeight.plus(linkWeight).toFixed(4) },
    finalizedAt: value.finalizedAt?.toISOString() ?? null,
  };
}

export function hasCircularLink(graph: Map<string, string[]>, root: string) {
  const visit = (node: string, path: Set<string>): boolean => {
    if (path.has(node)) return true;
    const nextPath = new Set(path); nextPath.add(node);
    return (graph.get(node) ?? []).some((next) => visit(next, nextPath));
  };
  return visit(root, new Set());
}

async function assertNoCycle(db: Prisma.TransactionClient | typeof prisma, ownerId: bigint, periodKey: string, links: bigint[]) {
  if (links.includes(ownerId)) throw new AppError(422, "SCORECARD_SELF_LINK_NOT_ALLOWED", "A Scorecard cannot link to itself");
  const values = await db.scorecardPeriodComposition.findMany({ where: { periodKey }, select: { scorecardId: true, links: { select: { linkedScorecardId: true } } } });
  const graph = new Map(values.map((row) => [row.scorecardId.toString(), row.links.map((link) => link.linkedScorecardId.toString())]));
  graph.set(ownerId.toString(), links.map(String));
  if (hasCircularLink(graph, ownerId.toString())) throw new AppError(422, "SCORECARD_LINK_CYCLE", "Linked Scorecards would create a circular dependency");
}

function linkedConflict(row: { id: bigint; code: string; name: string }, periodKey: string, reasonCode: string) {
  return { linkedScorecardId: row.id.toString(), scorecardCode: row.code, scorecardName: row.name, reasonCode, periodKey };
}

async function outbox(tx: Prisma.TransactionClient, type: string, owner: { id: bigint; code: string; aggregateVersion: number }, data: Prisma.InputJsonObject) {
  const eventId = randomUUID(); const occurredAt = new Date();
  await tx.outboxEvent.create({ data: {
    eventId, eventType: type, aggregateType: "scorecard", aggregateId: owner.id.toString(), aggregateVersion: owner.aggregateVersion,
    subject: type, occurredAt, payload: { eventId, eventType: type, producer: "exa-scorecards-service", occurredAt: occurredAt.toISOString(), aggregateId: owner.id.toString(), version: owner.aggregateVersion, data },
  } });
}

export const scorecardCompositionService = {
  async prepareNextPeriod(poolId: bigint, sourcePeriodKey: string, targetPeriodKey: string, actor: bigint) {
    const schedule = await kpiPoolClient.periods(poolId.toString());
    const sourcePeriod = schedule.find(period => period.periodKey === sourcePeriodKey);
    const successor = sourcePeriod && schedule.filter(period => period.start > sourcePeriod.end).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!successor || successor.periodKey !== targetPeriodKey) throw new AppError(409, "NEXT_PERIOD_NOT_SUCCESSOR", "Select the immediate next Pool Input Period");
    const period = await finalizedPeriod(poolId, targetPeriodKey);
    const previous = await prisma.scorecardPeriodComposition.findMany({ where: { kpiPoolExternalId: poolId, periodKey: sourcePeriodKey, statusCode: "FINALIZED", scorecard: { deletedAt: null, statusCode: { not: "INACTIVE" } } }, include });
    if (!previous.length) throw new AppError(422, "NEXT_PERIOD_NO_SCORECARDS", "No active Scorecards can be inherited from the closed period");
    const memberships = new Map(period.memberships.map(row => [row.kpiConfigurationExternalId.toString(), row]));
    for (const source of previous) {
      const current = await findComposition(source.scorecardId, targetPeriodKey);
      // Preserve any composition already prepared by the user or an earlier attempt.
      if (current && (current.statusCode === "FINALIZED" || current.kpis.length || current.links.length)) continue;
      const owner = await scorecard(source.scorecardId);
      const selections = await Promise.all(source.kpis.map(async row => {
        const membership = memberships.get(row.kpiConfigurationExternalId.toString());
        if (!membership) throw new AppError(422, "NEXT_PERIOD_CONFIGURATION_UNAVAILABLE", `${row.configurationCodeSnapshot} is not in the next Pool composition; review the selected configurations.`);
        const resolved = await kpiPoolClient.effectiveSettings(poolId.toString(), period.poolPeriodExternalId!.toString(), row.kpiConfigurationExternalId.toString());
        const frozen = freezeWeightedSettings(resolved.effective, (row.entityWeights ?? []) as EntityWeight[]);
        return { row, membership, frozen };
      }));
      await prisma.$transaction(async tx => {
        let target = await tx.scorecardPeriodComposition.findFirst({ where: { scorecardId: owner.id, periodKey: targetPeriodKey }, include });
        if (target && (target.statusCode !== "PREPARING" || target.kpis.length || target.links.length)) return;
        if (!target) target = await tx.scorecardPeriodComposition.create({ data: { scorecardId: owner.id, kpiPoolExternalId: poolId, poolPeriodExternalId: period.poolPeriodExternalId, poolCompositionExternalId: period.poolCompositionExternalId, periodKey: targetPeriodKey, periodStart: period.periodStart, periodEnd: period.periodEnd, createdByUserId: actor }, include });
        await tx.scorecardPeriodComposition.update({ where: { id: target.id }, data: { poolPeriodExternalId: period.poolPeriodExternalId, poolCompositionExternalId: period.poolCompositionExternalId, updatedByUserId: actor } });
        if (!target.scopeCustomizedAt) {
          await tx.scorecardPeriodDepartmentScope.deleteMany({ where: { scorecardPeriodCompositionId: target.id } });
          for (const department of source.scopeDepartments) await tx.scorecardPeriodDepartmentScope.create({ data: { scorecardPeriodCompositionId: target.id, externalDepartmentId: department.externalDepartmentId, externalCompanyId: department.externalCompanyId, departmentCodeSnapshot: department.departmentCodeSnapshot, departmentNameSnapshot: department.departmentNameSnapshot, displayOrder: department.displayOrder, createdByUserId: actor, employees: { create: department.employees.map(employee => ({ externalEmployeeId: employee.externalEmployeeId, employeeCodeSnapshot: employee.employeeCodeSnapshot, employeeNameSnapshot: employee.employeeNameSnapshot, createdByUserId: actor })) } } });
        }
        for (const { row, membership, frozen } of selections) await tx.scorecardPeriodKpi.create({ data: { scorecardPeriodCompositionId: target.id, kpiPoolMembershipExternalId: membership.poolMembershipExternalId, kpiDefinitionExternalId: membership.kpiDefinitionExternalId, kpiConfigurationExternalId: membership.kpiConfigurationExternalId, kpiPoolExternalId: poolId, periodKey: targetPeriodKey, definitionCodeSnapshot: membership.definitionCode, definitionNameSnapshot: membership.definitionName, configurationCodeSnapshot: membership.configurationCode, categoryNameSnapshot: membership.categoryName, goalSnapshot: frozen.goal, dataSourceSnapshot: membership.dataSourceSnapshot, measurementUnitSnapshot: membership.measurementUnitSnapshot, weightPercent: row.weightPercent, entityWeights: isIndividualEvaluation(frozen) ? (frozen.subjectGoals as Array<{ subjectExternalId: string; weight: string }>).map(({ subjectExternalId, weight }) => ({ subjectExternalId, weight })) : Prisma.DbNull, displayOrder: row.displayOrder, createdByUserId: actor } });
        for (const link of source.links) await tx.scorecardPeriodLink.create({ data: { scorecardPeriodCompositionId: target.id, linkedScorecardId: link.linkedScorecardId, weightPercent: link.weightPercent, displayOrder: link.displayOrder, createdByUserId: actor } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
    const pending = new Set(previous.map(row => row.scorecardId.toString()));
    const visiting = new Set<string>();
    const finalize = async (id: string): Promise<void> => {
      if (!pending.has(id)) return;
      if (visiting.has(id)) throw new AppError(422, "SCORECARD_DEPENDENCY_INVALID", "Linked Scorecards contain a cycle");
      visiting.add(id);
      const target = await findComposition(BigInt(id), targetPeriodKey);
      if (target?.statusCode !== "FINALIZED") {
        for (const link of target?.links ?? []) await finalize(link.linkedScorecardId.toString());
        await this.finalize(BigInt(id), targetPeriodKey, actor);
      }
      visiting.delete(id); pending.delete(id);
    };
    for (const row of previous) await finalize(row.scorecardId.toString());
    return this.monitoringMaterialization(poolId, period.poolPeriodExternalId!.toString());
  },
  async frozenKpiUsage(poolId: bigint, periodKey: string, configurationId: bigint) {
    const row = await prisma.scorecardPeriodKpi.findFirst({ where: { kpiPoolExternalId: poolId, periodKey, kpiConfigurationExternalId: configurationId, composition: { statusCode: "FINALIZED" } }, select: { composition: { select: { id: true, scorecardId: true } } } });
    return { data: { frozen: Boolean(row), scorecardPeriodCompositionId: row?.composition.id.toString() ?? null, scorecardId: row?.composition.scorecardId.toString() ?? null } };
  },
  async monitoringMaterialization(poolId: bigint, poolInputPeriodId: string) {
    const period = await kpiPoolClient.period(poolId.toString(), poolInputPeriodId);
    if (!period.poolCompositionId || period.workflowStatus !== "FINALIZED") {
      return { data: { poolId: poolId.toString(), poolInputPeriodId, periodKey: period.periodKey, periodStart: period.start, periodEnd: period.end, readiness: "NOT_READY", reason: "POOL_COMPOSITION_NOT_FINALIZED", applicableScorecardCount: 0, finalizedScorecardCount: 0, scorecards: [] } };
    }
    const rows = await prisma.scorecard.findMany({
      where: { kpiPoolExternalId: poolId, statusCode: { in: ["DRAFT", "ACTIVE"] }, deletedAt: null },
      select: {
        id: true, code: true, name: true, statusCode: true,
        departments: { orderBy: { displayOrder: "asc" }, select: { externalDepartmentId: true, departmentCodeSnapshot: true, departmentNameSnapshot: true } },
        periodCompositions: { where: { poolPeriodExternalId: BigInt(poolInputPeriodId) }, take: 1, include },
      },
      orderBy: { code: "asc" },
    });
    const finalizedByScorecard = new Map(rows.flatMap((row) => row.periodCompositions.filter((composition) => composition.statusCode === "FINALIZED").map((composition) => [row.id.toString(), composition] as const)));
    const scorecards = rows.map((row) => {
      const composition = row.periodCompositions[0];
      const compositionStatus = composition?.statusCode === "FINALIZED" ? "FINALIZED" : composition?.statusCode === "PREPARING" ? "PREPARING" : "NOT_STARTED";
      return {
        scorecardId: row.id.toString(), scorecardCode: row.code, scorecardName: row.name, lifecycle: row.statusCode,
        compositionStatus, scorecardPeriodCompositionId: composition?.id.toString() ?? null,
        departments: row.departments.map((department) => ({ id: department.externalDepartmentId.toString(), code: department.departmentCodeSnapshot, name: department.departmentNameSnapshot })),
        directKpiAssignments: composition?.kpis.map((kpi) => ({ scorecardKpiAssignmentId: kpi.id.toString(), kpiConfigurationId: kpi.kpiConfigurationExternalId.toString(), kpiConfigurationRevisionId: kpi.kpiConfigurationRevisionExternalId?.toString() ?? null, kpiDefinitionId: kpi.kpiDefinitionExternalId.toString(), poolMembershipExternalId: kpi.kpiPoolMembershipExternalId.toString(), effectiveSettings: kpi.effectiveSettingsSnapshot, settingsProvenance: kpi.settingsProvenanceSnapshot, weightPercent: kpi.weightPercent.toFixed(4), displayOrder: kpi.displayOrder })) ?? [],
        linkedScorecards: composition?.links.map((link) => ({ linkAssignmentId: link.id.toString(), linkedScorecardId: link.linkedScorecardId.toString(), linkedScorecardCompositionId: finalizedByScorecard.get(link.linkedScorecardId.toString())?.id.toString() ?? null, weightPercent: link.weightPercent.toFixed(4), displayOrder: link.displayOrder })) ?? [],
      };
    });
    const finalizedScorecardCount = scorecards.filter((item) => item.compositionStatus === "FINALIZED").length;
    const noScorecards = scorecards.length === 0;
    return { data: { poolId: poolId.toString(), poolInputPeriodId, poolCompositionId: period.poolCompositionId, periodKey: period.periodKey, periodStart: period.start, periodEnd: period.end, readiness: !noScorecards && finalizedScorecardCount === scorecards.length ? "READY" : "NOT_READY", reason: noScorecards ? "NO_APPLICABLE_SCORECARDS" : finalizedScorecardCount === scorecards.length ? null : "SCORECARD_COMPOSITIONS_INCOMPLETE", applicableScorecardCount: scorecards.length, finalizedScorecardCount, scorecards } };
  },
  async periods(scorecardId: bigint) {
    const owner = await scorecard(scorecardId);
    const [poolPeriods, compositions] = await Promise.all([
      kpiPoolClient.periods(owner.kpiPoolExternalId.toString()),
      prisma.scorecardPeriodComposition.findMany({ where: { scorecardId }, select: { id: true, periodKey: true, statusCode: true } }),
    ]);
    const byPeriod = new Map(compositions.map((row) => [row.periodKey, row]));
    return { data: poolPeriods.map((period) => ({
      ...period,
      // A workflow fallback is not a finalized composition. Only the stable
      // persisted composition identifier makes this period consumable here.
      poolCompositionStatus: period.poolCompositionId ? "FINALIZED" : period.workflowStatus === "EDITABLE" ? "EDITABLE" : "UNAVAILABLE",
      scorecardCompositionId: byPeriod.get(period.periodKey)?.id.toString() ?? null,
      // A previously prepared Scorecard draft may remain stored, but it is not
      // selectable until the owning Pool publishes this exact period.
      scorecardCompositionStatus: period.poolCompositionId ? (byPeriod.get(period.periodKey)?.statusCode ?? "AVAILABLE") : "UNAVAILABLE",
    })) };
  },

  async get(scorecardId: bigint, periodKey: string, actor: bigint) {
    const owner = await scorecard(scorecardId);
    const existing = await findComposition(scorecardId, periodKey); if (existing && (existing.scopeCustomizedAt !== null || existing.statusCode === "FINALIZED")) return assignmentDto(existing, owner.kpiPoolExternalId); canPrepare(owner);
    const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey);
    return assignmentDto(await getOrCreate(owner, period, actor), owner.kpiPoolExternalId);
  },

  async availableKpis(scorecardId: bigint, periodKey: string) {
    const owner = await scorecard(scorecardId); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    const selected = new Set(current?.kpis.map((row) => row.kpiPoolMembershipExternalId.toString()) ?? []);
    const occupied = await prisma.scorecardPeriodKpi.findMany({ where: { kpiPoolExternalId: owner.kpiPoolExternalId, periodKey, composition: { scorecardId: { not: scorecardId } } }, select: { kpiConfigurationExternalId: true, composition: { select: { scorecard: { select: { id: true, code: true, name: true } } } } } });
    const occupiedByConfiguration = new Map(occupied.map((row) => [row.kpiConfigurationExternalId.toString(), row.composition.scorecard]));
    return { data: period.memberships.map((row) => { const assigned = occupiedByConfiguration.get(row.kpiConfigurationExternalId.toString()); return { poolMembershipExternalId: row.poolMembershipExternalId.toString(), kpiDefinitionExternalId: row.kpiDefinitionExternalId.toString(), kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(), definitionCode: row.definitionCode, definitionName: row.definitionName, configurationCode: row.configurationCode, categoryName: row.categoryName, goal: row.goalSnapshot, dataSource: row.dataSourceSnapshot, measurementUnit: row.measurementUnitSnapshot, displayOrder: row.displayOrder, selectionStatus: selected.has(row.poolMembershipExternalId.toString()) ? "SELECTED_IN_SCORECARD" : assigned ? "ASSIGNED_TO_ANOTHER_SCORECARD" : "AVAILABLE_TO_SELECT", assignedScorecard: assigned ? { id: assigned.id.toString(), code: assigned.code, name: assigned.name } : null }; }) };
  },

  async updateScope(scorecardId: bigint, periodKey: string, departments: Array<{ id: string; companyId: string; code: string; name: string; collaborators: Array<{ id: string; code: string; name: string }> }>, actor: bigint) {
    const owner = await scorecard(scorecardId); canPrepare(owner);
    let current = await findComposition(scorecardId, periodKey);
    if (!current) {
      const inputPeriod = (await kpiPoolClient.periods(owner.kpiPoolExternalId.toString())).find((period) => period.periodKey === periodKey);
      if (!inputPeriod) throw new AppError(404, "POOL_INPUT_PERIOD_NOT_FOUND", "The Input Period does not exist in the selected KPI Pool");
      current = await getOrCreate(owner, { periodKey: inputPeriod.periodKey, periodStart: new Date(`${inputPeriod.start}T00:00:00.000Z`), periodEnd: new Date(`${inputPeriod.end}T00:00:00.000Z`), poolPeriodExternalId: inputPeriod.poolPeriodId ? BigInt(inputPeriod.poolPeriodId) : null, poolCompositionExternalId: inputPeriod.poolCompositionId ? BigInt(inputPeriod.poolCompositionId) : null }, actor);
    }
    editable(owner, current);
    const pool = await kpiPoolClient.getPool(owner.kpiPoolExternalId.toString());
    const allowedCompanyIds = new Set(pool.companies.map((company) => company.id));
    if (departments.some((department) => !allowedCompanyIds.has(department.companyId))) throw new AppError(422, "PERIOD_SCOPE_DEPARTMENT_OUTSIDE_POOL", "One or more Departments are outside the KPI Pool company scope");
    if (new Set(departments.map((department) => department.id)).size !== departments.length) throw new AppError(422, "PERIOD_SCOPE_DEPARTMENT_DUPLICATE", "A Department cannot appear more than once in the period scope");
    const collaboratorIds = departments.flatMap((department) => department.collaborators.map((collaborator) => collaborator.id));
    if (new Set(collaboratorIds).size !== collaboratorIds.length) throw new AppError(422, "PERIOD_SCOPE_COLLABORATOR_DUPLICATE", "A Collaborator cannot appear in more than one selected Department");
    await prisma.$transaction(async (tx) => {
      await tx.scorecardPeriodDepartmentScope.deleteMany({ where: { scorecardPeriodCompositionId: current.id } });
      for (const [index, department] of departments.entries()) await tx.scorecardPeriodDepartmentScope.create({ data: { scorecardPeriodCompositionId: current.id, externalDepartmentId: BigInt(department.id), externalCompanyId: BigInt(department.companyId), departmentCodeSnapshot: department.code, departmentNameSnapshot: department.name, displayOrder: index + 1, createdByUserId: actor, employees: { create: department.collaborators.map((employee) => ({ externalEmployeeId: BigInt(employee.id), employeeCodeSnapshot: employee.code, employeeNameSnapshot: employee.name, createdByUserId: actor })) } } });
      await tx.scorecardPeriodComposition.update({ where: { id: current.id }, data: { scopeCustomizedAt: new Date(), updatedByUserId: actor } });
      const inheritingFutureCompositions = await tx.scorecardPeriodComposition.findMany({
        where: { scorecardId, periodStart: { gt: current.periodStart }, statusCode: "PREPARING", scopeCustomizedAt: null },
        select: { id: true },
      });
      for (const future of inheritingFutureCompositions) {
        await tx.scorecardPeriodDepartmentScope.deleteMany({ where: { scorecardPeriodCompositionId: future.id } });
        for (const [index, department] of departments.entries()) await tx.scorecardPeriodDepartmentScope.create({ data: { scorecardPeriodCompositionId: future.id, externalDepartmentId: BigInt(department.id), externalCompanyId: BigInt(department.companyId), departmentCodeSnapshot: department.code, departmentNameSnapshot: department.name, displayOrder: index + 1, createdByUserId: actor, employees: { create: department.collaborators.map((employee) => ({ externalEmployeeId: BigInt(employee.id), employeeCodeSnapshot: employee.code, employeeNameSnapshot: employee.name, createdByUserId: actor })) } } });
      }
    });
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async addKpis(scorecardId: bigint, periodKey: string, items: Array<{ poolMembershipExternalId: string; weight: number }>, actor: bigint) {
    const owner = await scorecard(scorecardId); canPrepare(owner); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await getOrCreate(owner, period, actor); editable(owner, current);
    const allowed = new Map(period.memberships.map((row) => [row.poolMembershipExternalId.toString(), row]));
    if (items.some((item) => !allowed.has(item.poolMembershipExternalId))) throw new AppError(422, "KPI_NOT_IN_FINALIZED_POOL_COMPOSITION", "A KPI does not belong to this finalized Pool Composition");
    const configurationIds = items.map((item) => allowed.get(item.poolMembershipExternalId)!.kpiConfigurationExternalId);
    const offset = current.kpis.length;
    const conflictDetails = async () => {
      const occupied = await prisma.scorecardPeriodKpi.findMany({ where: { kpiPoolExternalId: owner.kpiPoolExternalId, periodKey, kpiConfigurationExternalId: { in: configurationIds }, composition: { scorecardId: { not: scorecardId } } }, select: { kpiConfigurationExternalId: true, configurationCodeSnapshot: true, definitionNameSnapshot: true, composition: { select: { scorecard: { select: { id: true, code: true, name: true } } } } } });
      return occupied.map((row) => ({ kpiConfigurationId: row.kpiConfigurationExternalId.toString(), kpiConfigurationCode: row.configurationCodeSnapshot, kpiName: row.definitionNameSnapshot, reasonCode: "ASSIGNED_TO_ANOTHER_SCORECARD", scorecardId: row.composition.scorecard.id.toString(), scorecardCode: row.composition.scorecard.code, scorecardName: row.composition.scorecard.name, periodKey }));
    };
    try {
      await prisma.$transaction(async (tx) => {
        const occupied = await tx.scorecardPeriodKpi.findMany({ where: { kpiPoolExternalId: owner.kpiPoolExternalId, periodKey, kpiConfigurationExternalId: { in: configurationIds }, composition: { scorecardId: { not: scorecardId } } }, select: { kpiConfigurationExternalId: true, configurationCodeSnapshot: true, definitionNameSnapshot: true, composition: { select: { scorecard: { select: { id: true, code: true, name: true } } } } } });
        if (occupied.length) throw new AppError(409, "SCORECARD_KPI_ASSIGNMENT_CONFLICT", "One or more KPI Configurations are no longer available.", { conflicts: occupied.map((row) => ({ kpiConfigurationId: row.kpiConfigurationExternalId.toString(), kpiConfigurationCode: row.configurationCodeSnapshot, kpiName: row.definitionNameSnapshot, reasonCode: "ASSIGNED_TO_ANOTHER_SCORECARD", scorecardId: row.composition.scorecard.id.toString(), scorecardCode: row.composition.scorecard.code, scorecardName: row.composition.scorecard.name, periodKey })) });
        await tx.scorecardPeriodKpi.createMany({ data: items.map((item, index) => { const row = allowed.get(item.poolMembershipExternalId)!; return { scorecardPeriodCompositionId: current.id, kpiPoolMembershipExternalId: row.poolMembershipExternalId, kpiDefinitionExternalId: row.kpiDefinitionExternalId, kpiConfigurationExternalId: row.kpiConfigurationExternalId, kpiPoolExternalId: owner.kpiPoolExternalId, periodKey, definitionCodeSnapshot: row.definitionCode, definitionNameSnapshot: row.definitionName, configurationCodeSnapshot: row.configurationCode, categoryNameSnapshot: row.categoryName, goalSnapshot: row.goalSnapshot, dataSourceSnapshot: row.dataSourceSnapshot, measurementUnitSnapshot: row.measurementUnitSnapshot, weightPercent: new Prisma.Decimal(item.weight), displayOrder: offset + index + 1, createdByUserId: actor }; }), skipDuplicates: false });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) throw new AppError(409, "SCORECARD_KPI_ASSIGNMENT_CONFLICT", "One or more KPI Configurations are no longer available.", { conflicts: await conflictDetails() });
      throw error;
    }
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async removeKpi(scorecardId: bigint, periodKey: string, configurationId: bigint) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    const result = await prisma.scorecardPeriodKpi.deleteMany({ where: { scorecardPeriodCompositionId: current.id, kpiConfigurationExternalId: configurationId } });
    if (!result.count) throw new AppError(404, "SCORECARD_KPI_NOT_FOUND", "KPI Configuration is not selected");
  },

  async availableLinks(scorecardId: bigint, periodKey: string) {
    const owner = await scorecard(scorecardId); await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    const selected = new Set(current?.links.map((row) => row.linkedScorecardId.toString()) ?? []);
    const [rows, compositions, candidatePeriods] = await Promise.all([
      prisma.scorecard.findMany({ where: { deletedAt: null }, include: { departments: { orderBy: { displayOrder: "asc" }, select: { departmentNameSnapshot: true } } }, orderBy: { code: "asc" } }),
      prisma.scorecardPeriodComposition.findMany({ where: { periodKey }, select: { scorecardId: true, statusCode: true, links: { select: { linkedScorecardId: true } } } }),
      prisma.poolPeriodReference.findMany({ where: { periodKey, compositionStatusCode: "FINALIZED" }, select: { kpiPoolExternalId: true } }),
    ]);
    const poolsWithPeriod = new Set(candidatePeriods.map((row) => row.kpiPoolExternalId.toString()));
    const periodStatus = new Map(compositions.map((row) => [row.scorecardId.toString(), row.statusCode]));
    const graph = new Map(compositions.map((row) => [row.scorecardId.toString(), row.links.map((link) => link.linkedScorecardId.toString())]));
    return { data: rows.map((row) => {
      const isSelected = selected.has(row.id.toString());
      const candidateGraph = new Map(graph); candidateGraph.set(scorecardId.toString(), [...selected, row.id.toString()]);
      const reasonCode = row.id === scorecardId ? "SELF_REFERENCE" : row.statusCode === "INACTIVE" ? "INACTIVE_SCORECARD" : !isSelected && !poolsWithPeriod.has(row.kpiPoolExternalId.toString()) ? "INPUT_PERIOD_NOT_AVAILABLE" : !isSelected && hasCircularLink(candidateGraph, scorecardId.toString()) ? "CIRCULAR_REFERENCE" : null;
      const compositionStatus = periodStatus.get(row.id.toString()) ?? "NOT_STARTED";
      const waiting = isSelected && compositionStatus !== "FINALIZED";
      return { id: row.id.toString(), code: row.code, name: row.name, departments: row.departments.map((department) => department.departmentNameSnapshot), status: row.statusCode, compositionStatus, reasonCode, selectionStatus: reasonCode ? "NOT_AVAILABLE" : waiting ? "LINKED_WAITING_FOR_FINALIZATION" : isSelected ? "LINKED_THIS_PERIOD" : "AVAILABLE_TO_LINK" };
    }) };
  },

  async addLinks(scorecardId: bigint, periodKey: string, items: Array<{ linkedScorecardId: string; weight: number }>, actor: bigint) {
    const owner = await scorecard(scorecardId); canPrepare(owner); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await getOrCreate(owner, period, actor); editable(owner, current);
    const linkedIds = items.map((item) => BigInt(item.linkedScorecardId));
    const candidates = await prisma.scorecard.findMany({ where: { id: { in: linkedIds }, deletedAt: null } });
    const availablePoolPeriods = new Set((await prisma.poolPeriodReference.findMany({ where: { periodKey, compositionStatusCode: "FINALIZED", kpiPoolExternalId: { in: candidates.map((row) => row.kpiPoolExternalId) } }, select: { kpiPoolExternalId: true } })).map((row) => row.kpiPoolExternalId.toString()));
    const byId = new Map(candidates.map((row) => [row.id.toString(), row]));
    const conflicts = items.flatMap((item) => { const row = byId.get(item.linkedScorecardId); const reasonCode = BigInt(item.linkedScorecardId) === scorecardId ? "SELF_REFERENCE" : !row || row.statusCode === "INACTIVE" ? "INACTIVE_SCORECARD" : !availablePoolPeriods.has(row.kpiPoolExternalId.toString()) ? "INPUT_PERIOD_NOT_AVAILABLE" : null; return reasonCode ? [linkedConflict(row ?? { id: BigInt(item.linkedScorecardId), code: item.linkedScorecardId, name: "Unavailable Scorecard" }, periodKey, reasonCode)] : []; });
    if (conflicts.length) throw new AppError(409, "LINKED_SCORECARD_CONFLICT", "One or more Scorecards are no longer eligible.", { conflicts });
    try {
      await prisma.$transaction(async (tx) => {
        const freshCandidates = await tx.scorecard.findMany({ where: { id: { in: linkedIds }, deletedAt: null } });
        const freshById = new Map(freshCandidates.map((row) => [row.id.toString(), row]));
        const freshPoolPeriods = new Set((await tx.poolPeriodReference.findMany({ where: { periodKey, compositionStatusCode: "FINALIZED", kpiPoolExternalId: { in: freshCandidates.map((row) => row.kpiPoolExternalId) } }, select: { kpiPoolExternalId: true } })).map((row) => row.kpiPoolExternalId.toString()));
        const eligibilityConflicts = items.flatMap((item) => { const row = freshById.get(item.linkedScorecardId); const reasonCode = BigInt(item.linkedScorecardId) === scorecardId ? "SELF_REFERENCE" : !row || row.statusCode === "INACTIVE" ? "INACTIVE_SCORECARD" : !freshPoolPeriods.has(row.kpiPoolExternalId.toString()) ? "INPUT_PERIOD_NOT_AVAILABLE" : null; return reasonCode ? [linkedConflict(row ?? { id: BigInt(item.linkedScorecardId), code: item.linkedScorecardId, name: "Unavailable Scorecard" }, periodKey, reasonCode)] : []; });
        if (eligibilityConflicts.length) throw new AppError(409, "LINKED_SCORECARD_CONFLICT", "One or more Scorecards are no longer eligible.", { conflicts: eligibilityConflicts });
        const allLinks = [...new Set([...current.links.map((row) => row.linkedScorecardId.toString()), ...items.map((item) => item.linkedScorecardId)])].map(BigInt);
        try { await assertNoCycle(tx, scorecardId, periodKey, allLinks); }
        catch (error) { if (error instanceof AppError) throw new AppError(409, "LINKED_SCORECARD_CONFLICT", "One or more Scorecards are no longer eligible.", { conflicts: candidates.map((row) => linkedConflict(row, periodKey, row.id === scorecardId ? "SELF_REFERENCE" : "CIRCULAR_REFERENCE")) }); throw error; }
        for (const [index, item] of items.entries()) await tx.scorecardPeriodLink.upsert({ where: { scorecardPeriodCompositionId_linkedScorecardId: { scorecardPeriodCompositionId: current.id, linkedScorecardId: BigInt(item.linkedScorecardId) } }, update: { weightPercent: new Prisma.Decimal(item.weight) }, create: { scorecardPeriodCompositionId: current.id, linkedScorecardId: BigInt(item.linkedScorecardId), weightPercent: new Prisma.Decimal(item.weight), displayOrder: current.links.length + index + 1, createdByUserId: actor } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) throw new AppError(409, "LINKED_SCORECARD_CONFLICT", "The linked Scorecard selection changed concurrently.", { conflicts: candidates.map((row) => linkedConflict(row, periodKey, "CIRCULAR_REFERENCE")) });
      throw error;
    }
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async removeLink(scorecardId: bigint, periodKey: string, linkedId: bigint) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    const result = await prisma.scorecardPeriodLink.deleteMany({ where: { scorecardPeriodCompositionId: current.id, linkedScorecardId: linkedId } }); if (!result.count) throw new AppError(404, "LINKED_SCORECARD_NOT_FOUND", "Linked Scorecard is not selected");
  },

  async updateWeights(scorecardId: bigint, periodKey: string, input: { kpis: Array<{ kpiConfigurationExternalId: string; weight: number; entityWeights?: EntityWeight[] }>; linkedScorecards: Array<{ linkedScorecardId: string; weight: number }> }) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    await prisma.$transaction(async (tx) => {
      const locked = await tx.scorecardPeriodComposition.updateMany({ where: { id: current.id, statusCode: "PREPARING" }, data: { updatedAt: new Date() } });
      if (!locked.count) throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The composition is read-only");
      for (const item of input.kpis) {
        const row = current.kpis.find(row => row.kpiConfigurationExternalId.toString() === item.kpiConfigurationExternalId);
        if (!row) throw new AppError(422, "SCORECARD_KPI_NOT_FOUND", "A KPI weight targets an item outside this composition");
        const resolved = await kpiPoolClient.effectiveSettings(owner.kpiPoolExternalId.toString(), current.poolPeriodExternalId!.toString(), item.kpiConfigurationExternalId);
        const entities = isIndividualEvaluation(resolved.effective) ? entityWeights(resolved.effective, item.entityWeights ?? (row.entityWeights ?? []) as EntityWeight[], false) : null;
        if (!entities && item.entityWeights?.length) throw new AppError(422, "SCORECARD_ENTITY_NOT_FOUND", "This KPI uses one official weight and has no entity weights");
        await tx.scorecardPeriodKpi.updateMany({ where: { id: row.id }, data: { entityWeights: entities ? entities.map(({subjectExternalId, weight}) => ({subjectExternalId, weight})) : Prisma.DbNull, weightPercent: entities ? entities.reduce((sum, entity) => sum.plus(entity.weight ?? 0), new Prisma.Decimal(0)) : new Prisma.Decimal(item.weight) } });
      }
      for (const item of input.linkedScorecards) if (!(await tx.scorecardPeriodLink.updateMany({ where: { scorecardPeriodCompositionId: current.id, linkedScorecardId: BigInt(item.linkedScorecardId) }, data: { weightPercent: new Prisma.Decimal(item.weight) } })).count) throw new AppError(422, "LINKED_SCORECARD_NOT_FOUND", "A linked weight targets an item outside this composition");
    });
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async finalize(scorecardId: bigint, periodKey: string, actor: bigint) {
    const owner = await scorecard(scorecardId); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    if (!current || (!current.kpis.length && !current.links.length)) throw new AppError(422, "SCORECARD_COMPOSITION_EMPTY", "Select at least one KPI or linked Scorecard before finalization"); editable(owner, current);
    const allowed = new Set(period.memberships.map((row) => row.poolMembershipExternalId.toString()));
    if (current.kpis.some((row) => !allowed.has(row.kpiPoolMembershipExternalId.toString()))) throw new AppError(422, "KPI_NOT_IN_FINALIZED_POOL_COMPOSITION", "A KPI no longer belongs to this Pool Composition");
    await assertNoCycle(prisma, scorecardId, periodKey, current.links.map((row) => row.linkedScorecardId));
    for (const link of current.links) if (!await prisma.scorecardPeriodComposition.findFirst({ where: { scorecardId: link.linkedScorecardId, periodKey, statusCode: "FINALIZED" } })) throw new AppError(422, "LINKED_SCORECARD_COMPOSITION_NOT_FINALIZED", `${link.linkedScorecard.code} is not finalized for ${periodKey}`);
    const resolvedSettings = new Map(await Promise.all(current.kpis.map(async (row) => [row.id.toString(), await kpiPoolClient.effectiveSettings(owner.kpiPoolExternalId.toString(), period.poolPeriodExternalId!.toString(), row.kpiConfigurationExternalId.toString())] as const)));
    const frozenSettings = new Map(current.kpis.map(row => {
      const settings = resolvedSettings.get(row.id.toString())!.effective;
      const frozen = freezeWeightedSettings(settings, (row.entityWeights ?? []) as EntityWeight[]);
      return [row.id.toString(), frozen] as const;
    }));
    const total = current.kpis.reduce((sum, row) => {
      const frozen = frozenSettings.get(row.id.toString())!;
      return sum.plus(isIndividualEvaluation(frozen) ? (frozen.subjectGoals as Array<{weight:string}>).reduce((subtotal, entity) => subtotal.plus(entity.weight), new Prisma.Decimal(0)) : row.weightPercent);
    }, current.links.reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0)));
    if (!total.equals(new Prisma.Decimal("100.0000"))) throw new AppError(422, "SCORECARD_WEIGHT_TOTAL_INVALID", "KPI and Linked Scorecard weights must total exactly 100.0000", { total: total.toFixed(4) });
    return prisma.$transaction(async (tx) => {
      const locked = await tx.scorecardPeriodComposition.updateMany({ where: { id: current.id, statusCode: "PREPARING" }, data: { updatedAt: new Date() } });
      if (!locked.count) throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The composition is read-only");
      const fresh = await tx.scorecardPeriodKpi.findMany({ where: { scorecardPeriodCompositionId: current.id } });
      if (fresh.length !== current.kpis.length || fresh.some(row => { const previous = current.kpis.find(item => item.id === row.id); return !previous || !row.weightPercent.equals(previous.weightPercent) || JSON.stringify(row.entityWeights) !== JSON.stringify(previous.entityWeights); })) throw new AppError(409, "SCORECARD_WEIGHT_CONFLICT", "Weights changed while finalizing; reload and try again");
      for (const row of current.kpis) {
        const resolved = resolvedSettings.get(row.id.toString())!;
        const frozen=frozenSettings.get(row.id.toString())!;
        await tx.scorecardPeriodKpi.update({ where: { id: row.id }, data: { kpiConfigurationRevisionExternalId: BigInt(resolved.effective.kpiConfigurationRevisionId), goalSnapshot: resolved.effective.goal, ...(frozen.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? { entityWeights: Prisma.DbNull } : {}), effectiveSettingsSnapshot: frozen as Prisma.InputJsonValue, settingsProvenanceSnapshot: resolved.sources as Prisma.InputJsonValue } });
      }
      const changed = await tx.scorecardPeriodComposition.updateMany({ where: { id: current.id, statusCode: "PREPARING" }, data: { statusCode: "FINALIZED", finalizedAt: new Date(), finalizedByUserId: actor, updatedByUserId: actor } });
      if (!changed.count) throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The composition is no longer editable");
      const first = owner.statusCode === "DRAFT"; const aggregate = await tx.scorecard.update({ where: { id: owner.id }, data: { statusCode: first ? "ACTIVE" : owner.statusCode, aggregateVersion: { increment: first ? 2 : 1 }, updatedByUserId: actor } });
      if (first) await outbox(tx, "scorecard.activated.v1", { ...aggregate, aggregateVersion: aggregate.aggregateVersion - 1 }, { scorecardCode: aggregate.code });
      await outbox(tx, "scorecard.composition.finalized.v1", aggregate, { scorecardCode: aggregate.code, periodKey, poolPeriodExternalId: period.poolPeriodExternalId!.toString(), poolCompositionExternalId: period.poolCompositionExternalId!.toString(), kpis: current.kpis.map((row) => ({ kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(), weight: row.weightPercent.toFixed(4) })), linkedScorecards: current.links.map((row) => ({ linkedScorecardId: row.linkedScorecardId.toString(), weight: row.weightPercent.toFixed(4) })), totalWeight: total.toFixed(4) });
      return dto(await tx.scorecardPeriodComposition.findUniqueOrThrow({ where: { id: current.id }, include }));
    });
  },

  async poolWorkflow(poolId: bigint, periodKey: string) {
    const rows = await prisma.scorecard.findMany({ where: { kpiPoolExternalId: poolId, statusCode: { not: "INACTIVE" }, deletedAt: null }, select: { periodCompositions: { where: { periodKey }, select: { statusCode: true } } } });
    const preparing = rows.filter((row) => row.periodCompositions[0]?.statusCode === "PREPARING").length; const finalized = rows.filter((row) => row.periodCompositions[0]?.statusCode === "FINALIZED").length;
    return { data: { poolId: poolId.toString(), periodKey, totalScorecards: rows.length, preparing, finalized, pending: rows.length - preparing - finalized, status: rows.length === 0 ? "NOT_STARTED" : finalized === rows.length ? "FINALIZED" : preparing || finalized ? "IN_PROGRESS" : "NOT_STARTED" } };
  },

  async poolUsage(poolId: bigint, periodKey: string) {
    const compositions = await prisma.scorecardPeriodComposition.findMany({
      where: { kpiPoolExternalId: poolId, periodKey, kpis: { some: {} } },
      select: { statusCode: true, scorecard: { select: { id: true, code: true, name: true, departments: { orderBy: { displayOrder: "asc" }, select: { departmentNameSnapshot: true } } } }, kpis: { select: { kpiConfigurationExternalId: true, configurationCodeSnapshot: true, definitionCodeSnapshot: true, definitionNameSnapshot: true } } },
      orderBy: { scorecard: { code: "asc" } },
    });
    const assignments = compositions.flatMap((composition) => composition.kpis.map((kpi) => ({ kpiConfigurationId: kpi.kpiConfigurationExternalId.toString(), configurationCode: kpi.configurationCodeSnapshot, kpiCode: kpi.definitionCodeSnapshot, kpiName: kpi.definitionNameSnapshot, scorecardId: composition.scorecard.id.toString(), scorecardCode: composition.scorecard.code, scorecardName: composition.scorecard.name, scorecardCompositionStatus: composition.statusCode, departments: composition.scorecard.departments.map((department) => department.departmentNameSnapshot) })));
    return { data: { poolId: poolId.toString(), periodKey, assignedKpiCount: new Set(assignments.map((row) => row.kpiConfigurationId)).size, scorecardsUsingCount: compositions.length, assignments } };
  },

  async poolUsageBatch(targets: Array<{ poolId: string; periodKey: string }>) {
    const unique = [...new Map(targets.map((target) => [`${target.poolId}:${target.periodKey}`, target])).values()];
    const rows = await prisma.scorecardPeriodComposition.findMany({
      where: { OR: unique.map((target) => ({ kpiPoolExternalId: BigInt(target.poolId), periodKey: target.periodKey })), kpis: { some: {} }, scorecard: { statusCode: { not: "INACTIVE" }, deletedAt: null } },
      select: { kpiPoolExternalId: true, periodKey: true, scorecardId: true },
    });
    return { data: unique.map((target) => ({ poolId: target.poolId, periodKey: target.periodKey, scorecardsUsing: new Set(rows.filter((row) => row.kpiPoolExternalId === BigInt(target.poolId) && row.periodKey === target.periodKey).map((row) => row.scorecardId.toString())).size })) };
  },
};

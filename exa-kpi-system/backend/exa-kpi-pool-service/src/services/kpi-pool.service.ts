import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { CreateKpiPoolBody, ListKpiPoolsQuery, UpdateKpiPoolBody } from "../schemas/kpi-pool.schema.js";
import { AppError } from "../utils/app-error.js";
import { toKpiPoolDto } from "../utils/kpi-pool.dto.js";
import { buildAreaScopeKey, formatPoolBusinessCode, type OrderedCode } from "../utils/pool-code.js";
import { poolPeriods } from "../domain/input-period.js";

const poolInclude = {
  areas: { orderBy: [{ displayOrder: "asc" as const }, { areaCodeSnapshot: "asc" as const }] },
  companies: { orderBy: [{ displayOrder: "asc" as const }, { companyCodeSnapshot: "asc" as const }] },
  kpis: { select: { effectiveFrom: true, effectiveTo: true } },
  _count: { select: { kpis: true } },
};

const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const idsEqual = (left: bigint[], right: bigint[]) => left.length === right.length && left.every((id, index) => id === right[index]);

async function loadReferences(tx: Prisma.TransactionClient, areaIds: bigint[], companyIds: bigint[], frequencyId: bigint) {
  const [areas, companies, frequency] = await Promise.all([
    tx.poolArea.findMany({ where: { id: { in: areaIds }, isActive: true }, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    tx.companyReference.findMany({ where: { externalCompanyId: { in: companyIds }, isActive: true }, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    tx.inputFrequencyReference.findFirst({ where: { externalInputFrequencyId: frequencyId, isActive: true } }),
  ]);
  if (areas.length !== areaIds.length) throw new AppError(422, "POOL_AREA_NOT_AVAILABLE", "One or more Pool Areas do not exist or are inactive");
  if (companies.length !== companyIds.length) throw new AppError(422, "COMPANY_NOT_AVAILABLE", "One or more companies do not exist or are inactive");
  if (!frequency) throw new AppError(422, "INPUT_FREQUENCY_NOT_AVAILABLE", "Input Frequency does not exist or is inactive");
  return { areas, companies, frequency };
}

async function allocateSequence(tx: Prisma.TransactionClient, areaScopeKey: string, issueYear: number) {
  const sequence = await tx.kpiPoolCodeSequence.upsert({
    where: { areaScopeKey_issueYear: { areaScopeKey, issueYear } },
    update: { lastSequence: { increment: 1 }, updatedAt: new Date() },
    create: { areaScopeKey, issueYear, lastSequence: 1 },
  });
  return sequence.lastSequence;
}

function orderedCodes(values: Array<{ code: string; displayOrder: number }>): OrderedCode[] {
  return values.map(({ code, displayOrder }) => ({ code, displayOrder }));
}

function associationData(references: Awaited<ReturnType<typeof loadReferences>>, actor: bigint) {
  return {
    areas: references.areas.map((area, index) => ({
      poolAreaId: area.id, displayOrder: index + 1, areaCodeSnapshot: area.code, areaNameSnapshot: area.name, createdByUserId: actor,
    })),
    companies: references.companies.map((company, index) => ({
      externalCompanyId: company.externalCompanyId, displayOrder: index + 1, companyCodeSnapshot: company.code, companyNameSnapshot: company.name, createdByUserId: actor,
    })),
  };
}

export const kpiPoolService = {
  async list(query: ListKpiPoolsQuery) {
    const where: Prisma.KpiPoolWhereInput = {
      deletedAt: null,
      ...(query.search ? { OR: [{ poolCode: { contains: query.search } }, { poolName: { contains: query.search } }] } : {}),
      ...(query.status?.length ? { statusCode: { in: query.status } } : {}),
      ...(query.companyId?.length ? { companies: { some: { externalCompanyId: { in: query.companyId.map(BigInt) } } } } : {}),
      ...(query.inputFrequencyId?.length ? { inputFrequencyExternalId: { in: query.inputFrequencyId.map(BigInt) } } : {}),
      ...(query.issueYear?.length ? { issueYear: { in: query.issueYear } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [records, totalItems] = await prisma.$transaction([
      prisma.kpiPool.findMany({ where, include: poolInclude, orderBy: { [query.sortBy]: query.sortOrder }, skip, take: query.pageSize }),
      prisma.kpiPool.count({ where }),
    ]);
    return {
      data: records.map(toKpiPoolDto),
      meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) },
    };
  },

  async getById(id: bigint) {
    const pool = await prisma.kpiPool.findFirst({ where: { id, deletedAt: null }, include: poolInclude });
    if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
    return toKpiPoolDto(pool);
  },

  async create(input: CreateKpiPoolBody, actor: bigint) {
    return prisma.$transaction(async (tx) => {
      const areaIds = input.poolAreaIds.map(BigInt);
      const companyIds = input.companyIds.map(BigInt);
      const references = await loadReferences(tx, areaIds, companyIds, BigInt(input.inputFrequencyId));
      poolPeriods(asDate(input.validFrom), asDate(input.validTo), references.frequency.monthsPerPeriod);
      const areaScopeKey = buildAreaScopeKey(orderedCodes(references.areas));
      const issueYear = new Date().getUTCFullYear();
      const poolSequence = await allocateSequence(tx, areaScopeKey, issueYear);
      const poolCode = formatPoolBusinessCode({ areas: references.areas, sequence: poolSequence, issueYear });
      const associations = associationData(references, actor);
      const pool = await tx.kpiPool.create({
        data: {
          poolCode, poolSequence, issueYear, areaScopeKey, poolName: input.poolName,
          description: input.description ?? null, notes: input.notes ?? null,
          inputFrequencyExternalId: references.frequency.externalInputFrequencyId,
          inputFrequencyCode: references.frequency.code,
          validFrom: asDate(input.validFrom), validTo: asDate(input.validTo), statusCode: "DRAFT", createdByUserId: actor,
          areas: { create: associations.areas }, companies: { create: associations.companies },
        },
        include: poolInclude,
      });
      return toKpiPoolDto(pool);
    });
  },

  async update(id: bigint, input: UpdateKpiPoolBody, actor: bigint) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.kpiPool.findFirst({ where: { id, deletedAt: null }, include: poolInclude });
      if (!current) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
      if (current.statusCode !== "DRAFT") throw new AppError(409, "KPI_POOL_STRUCTURE_LOCKED", "Only DRAFT Pools can be structurally edited");

      const areaIds = input.poolAreaIds?.map(BigInt) ?? current.areas.map((area) => area.poolAreaId);
      const companyIds = input.companyIds?.map(BigInt) ?? current.companies.map((company) => company.externalCompanyId);
      const frequencyId = input.inputFrequencyId ? BigInt(input.inputFrequencyId) : current.inputFrequencyExternalId;
      const references = await loadReferences(tx, areaIds, companyIds, frequencyId);
      const validFrom = input.validFrom ? asDate(input.validFrom) : current.validFrom;
      const validTo = input.validTo ? asDate(input.validTo) : current.validTo;
      if (validTo < validFrom) throw new AppError(422, "INVALID_POOL_VALIDITY", "validTo must be on or after validFrom");
      poolPeriods(validFrom, validTo, references.frequency.monthsPerPeriod);

      const areaScopeKey = buildAreaScopeKey(orderedCodes(references.areas));
      const scopeChanged = areaScopeKey !== current.areaScopeKey;
      const poolSequence = scopeChanged ? await allocateSequence(tx, areaScopeKey, current.issueYear) : current.poolSequence;
      const poolCode = scopeChanged ? formatPoolBusinessCode({ areas: references.areas, sequence: poolSequence, issueYear: current.issueYear }) : current.poolCode;
      const associations = associationData(references, actor);
      const areasChanged = !idsEqual(references.areas.map((area) => area.id), current.areas.map((area) => area.poolAreaId));
      const companiesChanged = !idsEqual(references.companies.map((company) => company.externalCompanyId), current.companies.map((company) => company.externalCompanyId));

      await tx.kpiPool.update({ where: { id }, data: {
        poolCode, poolSequence, areaScopeKey,
        poolName: input.poolName, description: input.description, notes: input.notes,
        inputFrequencyExternalId: references.frequency.externalInputFrequencyId,
        inputFrequencyCode: references.frequency.code, validFrom, validTo, updatedAt: new Date(), updatedByUserId: actor,
      } });
      if (areasChanged) {
        await tx.kpiPoolArea.deleteMany({ where: { kpiPoolId: id } });
        await tx.kpiPoolArea.createMany({ data: associations.areas.map((area) => ({ ...area, kpiPoolId: id })) });
      }
      if (companiesChanged) {
        await tx.kpiPoolCompany.deleteMany({ where: { kpiPoolId: id } });
        await tx.kpiPoolCompany.createMany({ data: associations.companies.map((company) => ({ ...company, kpiPoolId: id })) });
      }
      return toKpiPoolDto(await tx.kpiPool.findUniqueOrThrow({ where: { id }, include: poolInclude }));
    });
  },

  async lookups() {
    const [areas, companies, frequencies] = await Promise.all([
      prisma.poolArea.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
      prisma.companyReference.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
      prisma.inputFrequencyReference.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    ]);
    return {
      areas: areas.map((value) => ({ id: value.id.toString(), code: value.code, name: value.name, displayOrder: value.displayOrder })),
      companies: companies.map((value) => ({ id: value.externalCompanyId.toString(), code: value.code, name: value.name, displayOrder: value.displayOrder })),
      inputFrequencies: frequencies.map((value) => ({ id: value.externalInputFrequencyId.toString(), code: value.code, name: value.name, displayOrder: value.displayOrder })),
    };
  },
};

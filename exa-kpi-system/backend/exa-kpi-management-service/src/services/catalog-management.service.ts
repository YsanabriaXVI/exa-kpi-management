import { prisma } from "../config/database/prisma.js";
import type { DataSourceBody, MeasurementUnitBody, SubjectTypeBody, SubjectValueBody } from "../schemas/catalog-management.schema.js";
import { AppError } from "../utils/app-error.js";

const duplicate = (label: string) => new AppError(`${label} code already exists`, 409, "CATALOG_CODE_EXISTS");
const missing = (label: string) => new AppError(`${label} not found`, 404, "CATALOG_ITEM_NOT_FOUND");
const normalizedUnitFamily = (code: string, name: string, symbol: string) => {
  const token = `${code} ${name} ${symbol}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^(KM|KMS|KILOMETER|KILOMETERS|KILOMETRO|KILOMETROS|KILOMETRE|KILOMETRES)+$/.test(token) || ["KM", "KMS", "KILOMETERS", "KILOMETROS", "KILOMETRES"].includes(code.toUpperCase())) return "KILOMETER";
  if (["PERCENT", "PERCENTAGE", "PCT"].includes(code.toUpperCase()) || symbol === "%") return "PERCENT";
  if (["COUNT", "COUNTS", "UNIT", "UNITS"].includes(code.toUpperCase())) return "COUNT";
  return symbol.trim().toLowerCase().replace(/\s+/g, "") || code.toLowerCase();
};
async function assertUniqueUnit(input: MeasurementUnitBody, excludeId?: bigint) {
  const units = await prisma.measurementUnit.findMany({ where: excludeId ? { id: { not: excludeId } } : undefined, select: { id: true, code: true, name: true, symbol: true } });
  const family = normalizedUnitFamily(input.code, input.name, input.symbol);
  const equivalent = units.find((unit) => normalizedUnitFamily(unit.code, unit.name, unit.symbol) === family);
  if (equivalent) throw new AppError(`Equivalent Measurement Unit already exists: ${equivalent.code} (${equivalent.symbol})`, 409, "MEASUREMENT_UNIT_EQUIVALENT_EXISTS", { existingId: equivalent.id.toString(), existingCode: equivalent.code });
}

async function subjectTypeUsage(subjectType: string) {
  return prisma.kpiConfigurationRevision.count({ where: { subjectType } });
}
async function subjectValueUsage(subjectType: string, externalId: string) {
  return prisma.kpiConfigurationRevisionSubject.count({ where: { subjectType, subjectExternalId: externalId } });
}

export const catalogManagementService = {
  async listSubjectTypes() {
    const types = await prisma.subjectTypeCatalog.findMany({ orderBy: { name: "asc" } });
    const values = await prisma.kpiConfigurationSubjectCatalog.groupBy({ by: ["subjectType", "isActive"], _count: true });
    const usage = await prisma.kpiConfigurationRevision.groupBy({ by: ["subjectType"], where: { subjectType: { not: null } }, _count: true });
    return types.map((item) => ({
      id: item.id.toString(), code: item.code, name: item.name, isActive: item.isActive,
      valueCount: values.filter((value) => value.subjectType === item.code).reduce((sum, value) => sum + value._count, 0),
      activeValueCount: values.find((value) => value.subjectType === item.code && value.isActive)?._count ?? 0,
      referenceCount: usage.find((value) => value.subjectType === item.code)?._count ?? 0,
      updatedAt: (item.updatedAt ?? item.createdAt).toISOString(),
    }));
  },
  async createSubjectType(input: SubjectTypeBody, actorUserId: bigint | null) {
    if (await prisma.subjectTypeCatalog.findUnique({ where: { code: input.code } })) throw duplicate("Subject Type");
    const item = await prisma.subjectTypeCatalog.create({ data: { ...input, createdByUserId: actorUserId } });
    return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined };
  },
  async updateSubjectType(id: bigint, input: SubjectTypeBody, actorUserId: bigint | null) {
    const current = await prisma.subjectTypeCatalog.findUnique({ where: { id } });
    if (!current) throw missing("Subject Type");
    if (input.code !== current.code) throw new AppError("Subject Type code is immutable", 422, "CATALOG_CODE_IMMUTABLE");
    const item = await prisma.subjectTypeCatalog.update({ where: { id }, data: { name: input.name, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined };
  },
  async toggleSubjectType(id: bigint, actorUserId: bigint | null) {
    const current = await prisma.subjectTypeCatalog.findUnique({ where: { id } });
    if (!current) throw missing("Subject Type");
    const referenceCount = await subjectTypeUsage(current.code);
    const item = await prisma.subjectTypeCatalog.update({ where: { id }, data: { isActive: !current.isActive, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { id: item.id.toString(), code: item.code, name: item.name, isActive: item.isActive, referenceCount };
  },
  async listSubjectValues(subjectType: string) {
    const type = await prisma.subjectTypeCatalog.findUnique({ where: { code: subjectType } });
    if (!type) throw missing("Subject Type");
    const items = await prisma.kpiConfigurationSubjectCatalog.findMany({ where: { subjectType }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
    return Promise.all(items.map(async (item) => ({ id: item.id.toString(), externalId: item.externalId, code: item.code, name: item.name, isActive: item.isActive, referenceCount: await subjectValueUsage(subjectType, item.externalId), updatedAt: (item.updatedAt ?? item.createdAt).toISOString() })));
  },
  async createSubjectValue(subjectType: string, input: SubjectValueBody, actorUserId: bigint | null) {
    const type = await prisma.subjectTypeCatalog.findUnique({ where: { code: subjectType } });
    if (!type) throw missing("Subject Type");
    if (await prisma.kpiConfigurationSubjectCatalog.findFirst({ where: { subjectType, code: input.code } })) throw duplicate("Subject Value");
    const last = await prisma.kpiConfigurationSubjectCatalog.aggregate({ where: { subjectType }, _max: { displayOrder: true } });
    const item = await prisma.kpiConfigurationSubjectCatalog.create({ data: { subjectType, externalId: input.code, code: input.code, name: input.name, displayOrder: (last._max.displayOrder ?? 0) + 1 } });
    return { id: item.id.toString(), externalId: item.externalId, code: item.code, name: item.name, isActive: item.isActive, referenceCount: 0 };
  },
  async updateSubjectValue(id: bigint, input: SubjectValueBody, actorUserId: bigint | null) {
    const current = await prisma.kpiConfigurationSubjectCatalog.findUnique({ where: { id } });
    if (!current) throw missing("Subject Value");
    if (input.code !== current.code) throw new AppError("Subject Value code is immutable", 422, "CATALOG_CODE_IMMUTABLE");
    const item = await prisma.kpiConfigurationSubjectCatalog.update({ where: { id }, data: { name: input.name, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { id: item.id.toString(), externalId: item.externalId, code: item.code, name: item.name, isActive: item.isActive, referenceCount: await subjectValueUsage(item.subjectType, item.externalId) };
  },
  async toggleSubjectValue(id: bigint, actorUserId: bigint | null) {
    const current = await prisma.kpiConfigurationSubjectCatalog.findUnique({ where: { id } });
    if (!current) throw missing("Subject Value");
    const referenceCount = await subjectValueUsage(current.subjectType, current.externalId);
    const item = await prisma.kpiConfigurationSubjectCatalog.update({ where: { id }, data: { isActive: !current.isActive, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { id: item.id.toString(), externalId: item.externalId, code: item.code, name: item.name, isActive: item.isActive, referenceCount };
  },
  async listMeasurementUnits() {
    const items = await prisma.measurementUnit.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { configurations: true, configurationRevisions: true } } } });
    return items.map((item) => { const duplicate = items.find((candidate) => candidate.id !== item.id && normalizedUnitFamily(candidate.code, candidate.name, candidate.symbol) === normalizedUnitFamily(item.code, item.name, item.symbol)); return { id: item.id.toString(), code: item.code, symbol: item.symbol, name: item.name, description: item.description, decimalPlaces: item.decimalPlaces, isPercentage: item.isPercentage, isActive: item.isActive, referenceCount: item._count.configurations + item._count.configurationRevisions, duplicateOf: duplicate ? { id: duplicate.id.toString(), code: duplicate.code } : null, updatedAt: (item.updatedAt ?? item.createdAt).toISOString() }; });
  },
  async createMeasurementUnit(input: MeasurementUnitBody, actorUserId: bigint | null) {
    if (await prisma.measurementUnit.findFirst({ where: { OR: [{ code: input.code }, { symbol: input.symbol }] } })) throw duplicate("Measurement Unit");
    await assertUniqueUnit(input);
    const item = await prisma.measurementUnit.create({ data: { ...input, description: input.description ?? null, createdByUserId: actorUserId } });
    return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined, referenceCount: 0 };
  },
  async updateMeasurementUnit(id: bigint, input: MeasurementUnitBody, actorUserId: bigint | null) {
    const current = await prisma.measurementUnit.findUnique({ where: { id } }); if (!current) throw missing("Measurement Unit");
    if (input.code !== current.code) throw new AppError("Measurement Unit code is immutable", 422, "CATALOG_CODE_IMMUTABLE");
    await assertUniqueUnit(input, id);
    const item = await prisma.measurementUnit.update({ where: { id }, data: { ...input, description: input.description ?? null, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined };
  },
  async toggleMeasurementUnit(id: bigint, actorUserId: bigint | null) {
    const current = await prisma.measurementUnit.findUnique({ where: { id }, include: { _count: { select: { configurations: true, configurationRevisions: true } } } }); if (!current) throw missing("Measurement Unit");
    const item = await prisma.measurementUnit.update({ where: { id }, data: { isActive: !current.isActive, updatedAt: new Date(), updatedByUserId: actorUserId } });
    return { id: item.id.toString(), isActive: item.isActive, referenceCount: current._count.configurations + current._count.configurationRevisions };
  },
  async listDataSources() {
    const items = await prisma.dataSource.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { configurations: true, configurationRevisions: true } } } });
    return items.map((item) => ({ id: item.id.toString(), code: item.code, name: item.name, description: item.description, sourceType: item.sourceType, isExternal: item.isExternal, supportsAutomation: item.supportsAutomation, isActive: item.isActive, referenceCount: item._count.configurations + item._count.configurationRevisions, updatedAt: (item.updatedAt ?? item.createdAt).toISOString() }));
  },
  async createDataSource(input: DataSourceBody, actorUserId: bigint | null) { if (await prisma.dataSource.findUnique({ where: { code: input.code } })) throw duplicate("Data Source"); const item = await prisma.dataSource.create({ data: { ...input, description: input.description ?? null, createdByUserId: actorUserId } }); return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined, referenceCount: 0 }; },
  async updateDataSource(id: bigint, input: DataSourceBody, actorUserId: bigint | null) { const current = await prisma.dataSource.findUnique({ where: { id } }); if (!current) throw missing("Data Source"); if (input.code !== current.code) throw new AppError("Data Source code is immutable", 422, "CATALOG_CODE_IMMUTABLE"); const item = await prisma.dataSource.update({ where: { id }, data: { ...input, description: input.description ?? null, updatedAt: new Date(), updatedByUserId: actorUserId } }); return { ...item, id: item.id.toString(), createdByUserId: undefined, updatedByUserId: undefined }; },
  async toggleDataSource(id: bigint, actorUserId: bigint | null) { const current = await prisma.dataSource.findUnique({ where: { id }, include: { _count: { select: { configurations: true, configurationRevisions: true } } } }); if (!current) throw missing("Data Source"); const item = await prisma.dataSource.update({ where: { id }, data: { isActive: !current.isActive, updatedAt: new Date(), updatedByUserId: actorUserId } }); return { id: item.id.toString(), isActive: item.isActive, referenceCount: current._count.configurations + current._count.configurationRevisions }; },
  async usage(kind: "subject-type" | "subject-value" | "measurement-unit" | "data-source", id: string) {
    let where: Record<string, unknown> = {};
    if (kind === "subject-type") { const item = await prisma.subjectTypeCatalog.findUnique({ where: { id: BigInt(id) } }); if (!item) throw missing("Subject Type"); where = { subjectType: item.code }; }
    if (kind === "subject-value") { const item = await prisma.kpiConfigurationSubjectCatalog.findUnique({ where: { id: BigInt(id) } }); if (!item) throw missing("Subject Value"); const subjects = await prisma.kpiConfigurationRevisionSubject.findMany({ where: { subjectType: item.subjectType, subjectExternalId: item.externalId }, select: { kpiConfigurationRevisionId: true } }); where = { id: { in: subjects.map((subject) => subject.kpiConfigurationRevisionId) } }; }
    if (kind === "measurement-unit") where = { OR: [{ measurementUnitId: BigInt(id) }, { goalUnitId: BigInt(id) }, { groupGoalUnitId: BigInt(id) }] };
    if (kind === "data-source") where = { dataSourceId: BigInt(id) };
    const revisions = await prisma.kpiConfigurationRevision.findMany({ where, orderBy: { createdAt: "desc" }, include: { configuration: { include: { definition: true, status: true } } } });
    return revisions.map((revision) => ({ configurationId: revision.kpiConfigurationId.toString(), configCode: revision.configuration.configCode, kpiCode: revision.configuration.definition.kpiCode, kpiName: revision.configuration.definition.kpiName, revisionNumber: revision.revisionNumber, status: revision.configuration.status.code, effectiveFrom: revision.effectiveFrom.toISOString().slice(0, 10), effectiveTo: revision.effectiveTo?.toISOString().slice(0, 10) ?? null }));
  },
};

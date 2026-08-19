import { Prisma } from "@prisma/client";
import { prisma } from "../config/database/prisma.js";
import type { KpiConfigurationBody } from "../schemas/kpi-configuration.schema.js";
import { AppError } from "../utils/app-error.js";
import { toKpiConfigurationDto } from "../utils/kpi-configuration.dto.js";

const include = { definition: true, measurementUnit: true, primaryDataSource: true, status: true, inputFrequency: true, revisions: { orderBy: { revisionNumber: "desc" as const }, take: 1, include: { evaluationType: true, thresholds: { include: { trafficLightLevel: true } } } } };
const lower = (name: string) => /(reduce|damage|cost|time|claim|emission|error|variance|daño|costo|tiempo)/i.test(name);
async function catalogs(tx: Prisma.TransactionClient, input: KpiConfigurationBody, definitionName: string) {
  const [unit, source, frequency, status, evaluation, levels] = await Promise.all([
    tx.measurementUnit.findFirst({ where: { symbol: input.measurementUnit, isActive: true } }), tx.dataSource.findFirst({ where: { name: input.dataSource, isActive: true } }),
    tx.inputFrequency.findUnique({ where: { code: "MONTHLY" } }), tx.kpiConfigurationStatus.findUnique({ where: { code: input.isActive ? "CONFIGURED" : "INACTIVE" } }),
    tx.evaluationType.findUnique({ where: { code: lower(definitionName) ? "LOWER_IS_BETTER" : "HIGHER_IS_BETTER" } }), tx.trafficLightLevel.findMany({ where: { code: { in: ["RED", "YELLOW", "GREEN"] } } }),
  ]);
  if (!unit || !source || !frequency || !status || !evaluation || levels.length !== 3) throw new AppError("KPI Configuration catalogs are unavailable", 422, "KPI_CONFIGURATION_CATALOG_UNAVAILABLE");
  return { unit, source, frequency, status, evaluation, levels };
}
async function existing(id: bigint) { const item = await prisma.kpiConfiguration.findFirst({ where: { id, deletedAt: null }, include }); if (!item) throw new AppError("KPI Configuration not found", 404, "KPI_CONFIGURATION_NOT_FOUND"); return item; }
async function writeThresholds(tx: Prisma.TransactionClient, revisionId: bigint, input: KpiConfigurationBody, levels: { id: bigint; code: string }[]) {
  const values: Record<string, [number, number]> = { RED: [input.ranges.redFrom, input.ranges.redTo], YELLOW: [input.ranges.yellowFrom, input.ranges.yellowTo], GREEN: [input.ranges.greenFrom, input.ranges.greenTo] };
  await tx.kpiConfigurationRevisionThreshold.createMany({ data: ["RED", "YELLOW", "GREEN"].map((code, index) => { const range = values[code]!; return { kpiConfigurationRevisionId: revisionId, trafficLightLevelId: levels.find((level) => level.code === code)!.id, rangeMinPercent: range[0], rangeMaxPercent: range[1], includesMin: true, includesMax: true, displayOrder: index + 1 }; }) });
}
async function writeRevision(tx: Prisma.TransactionClient, configurationId: bigint, revisionNumber: number, input: KpiConfigurationBody, evaluationId: bigint, levels: { id: bigint; code: string }[]) {
  const revision = await tx.kpiConfigurationRevision.create({ data: { kpiConfigurationId: configurationId, revisionNumber, targetValue: input.goal, evaluationTypeId: evaluationId, effectiveFrom: new Date(), changeReason: revisionNumber === 1 ? "Initial configuration" : "Configuration updated" } });
  await writeThresholds(tx, revision.id, input, levels);
}
async function nextConfigCode(tx: Prisma.TransactionClient, definitionId: bigint, definitionCode: string) {
  const numericCode = definitionCode.replace(/\D/g, "");
  const siblings = await tx.kpiConfiguration.findMany({ where: { kpiDefinitionId: definitionId }, select: { configCode: true } });
  const highestSuffix = siblings.reduce((highest, sibling) => {
    const match = new RegExp(`^KPC-${numericCode}-(\\d+)$`).exec(sibling.configCode);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `KPC-${numericCode}-${String(highestSuffix + 1).padStart(2, "0")}`;
}
export const kpiConfigurationService = {
  async list(query: { page: number; pageSize: number; search?: string }) { const where: Prisma.KpiConfigurationWhereInput = { deletedAt: null, ...(query.search ? { OR: [{ configCode: { contains: query.search } }, { definition: { is: { kpiCode: { contains: query.search } } } }, { definition: { is: { kpiName: { contains: query.search } } } }] } : {}) }; const [items,totalItems] = await Promise.all([prisma.kpiConfiguration.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (query.page-1)*query.pageSize, take: query.pageSize }), prisma.kpiConfiguration.count({ where })]); return { data: items.map(toKpiConfigurationDto), meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems/query.pageSize) } }; },
  async get(id: bigint) { return toKpiConfigurationDto(await existing(id)); },
  async create(input: KpiConfigurationBody, actor: bigint|null) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const definition = await tx.kpiDefinition.findFirst({ where: { id: BigInt(input.definitionId), deletedAt: null, isActive: true } });
          if (!definition) throw new AppError("Active KPI Definition not found",422,"KPI_DEFINITION_NOT_AVAILABLE");
          const c = await catalogs(tx,input,definition.kpiName);
          const configCode = await nextConfigCode(tx, definition.id, definition.kpiCode);
          const created = await tx.kpiConfiguration.create({data:{kpiDefinitionId:definition.id,configCode,measurementUnitId:c.unit.id,inputFrequencyId:c.frequency.id,primaryDataSourceId:c.source.id,kpiConfigurationStatusId:c.status.id,createdByUserId:actor}});
          await writeRevision(tx,created.id,1,input,c.evaluation.id,c.levels);
          return toKpiConfigurationDto(await tx.kpiConfiguration.findUniqueOrThrow({where:{id:created.id},include}));
        });
      } catch (error) {
        const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!collision || attempt === 2) throw error;
      }
    }
    throw new AppError("KPI Configuration code could not be generated", 409, "KPI_CONFIGURATION_CODE_CONFLICT");
  },
  async update(id: bigint,input:KpiConfigurationBody,actor:bigint|null){ await existing(id); return prisma.$transaction(async tx=>{ const definition=await tx.kpiDefinition.findFirst({where:{id:BigInt(input.definitionId),deletedAt:null}}); if(!definition) throw new AppError("KPI Definition not found",422,"KPI_DEFINITION_NOT_AVAILABLE"); const c=await catalogs(tx,input,definition.kpiName); const latest=await tx.kpiConfigurationRevision.findFirst({where:{kpiConfigurationId:id},orderBy:{revisionNumber:"desc"}}); await tx.kpiConfiguration.update({where:{id},data:{measurementUnitId:c.unit.id,primaryDataSourceId:c.source.id,kpiConfigurationStatusId:c.status.id,updatedAt:new Date(),updatedByUserId:actor}}); const today=new Date();today.setUTCHours(0,0,0,0); if(latest&&latest.effectiveFrom.getTime()===today.getTime()){await tx.kpiConfigurationRevision.update({where:{id:latest.id},data:{targetValue:input.goal,evaluationTypeId:c.evaluation.id,changeReason:"Configuration updated before becoming historical",updatedAt:new Date(),updatedByUserId:actor}});await tx.kpiConfigurationRevisionThreshold.deleteMany({where:{kpiConfigurationRevisionId:latest.id}});await writeThresholds(tx,latest.id,input,c.levels);}else{if(latest&&!latest.effectiveTo){const yesterday=new Date(today);yesterday.setUTCDate(yesterday.getUTCDate()-1);await tx.kpiConfigurationRevision.update({where:{id:latest.id},data:{effectiveTo:yesterday}});}await writeRevision(tx,id,(latest?.revisionNumber??0)+1,input,c.evaluation.id,c.levels);} return toKpiConfigurationDto(await tx.kpiConfiguration.findUniqueOrThrow({where:{id},include})); }); },
  async deactivate(id:bigint,actor:bigint|null){await existing(id);const status=await prisma.kpiConfigurationStatus.findUnique({where:{code:"INACTIVE"}});if(!status)throw new AppError("Inactive status unavailable",422,"KPI_CONFIGURATION_CATALOG_UNAVAILABLE");return toKpiConfigurationDto(await prisma.kpiConfiguration.update({where:{id},data:{kpiConfigurationStatusId:status.id,updatedAt:new Date(),updatedByUserId:actor},include}));},
  async softDelete(id:bigint,actor:bigint|null){await existing(id);return toKpiConfigurationDto(await prisma.kpiConfiguration.update({where:{id},data:{deletedAt:new Date(),updatedAt:new Date(),updatedByUserId:actor},include}));}
};

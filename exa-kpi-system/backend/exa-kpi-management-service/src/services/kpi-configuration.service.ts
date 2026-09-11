import { existsSync } from "node:fs";
import { additiveResultError } from "../contracts/additive-results.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database/prisma.js";
import type { BatchLookupKpiConfigurationsBody, EffectiveKpiConfigurationSnapshotsBody, InternalKpiConfigurationCatalogQuery, KpiConfigurationBody } from "../schemas/kpi-configuration.schema.js";
import { AppError } from "../utils/app-error.js";
import { toKpiConfigurationDto, configurationDisplayName } from "../utils/kpi-configuration.dto.js";
import { evaluateKpiExecutability } from "../domain/kpi-executability.js";

const unitSnapshot = (unit: {id: bigint; code: string; name: string; symbol: string}) => ({id: unit.id.toString(), code: unit.code, name: unit.name, symbol: unit.symbol});
const revisionRelations = { evaluationType: true, measurementUnit: true, goalUnit: true, groupGoalUnit: true, dataSource: true, thresholds: { include: { trafficLightLevel: true } }, subjects: { orderBy: { displayOrder: "asc" as const } }, subjectGoals: { orderBy: { displayOrder: "asc" as const }, include: { goalUnit: true, resultUnit: true } }, measurementInputs: { orderBy: { displayOrder: "asc" as const }, include: { inputUnit: true } } };
const include = { definition: true, measurementUnit: true, primaryDataSource: true, status: true, inputFrequency: true, revisions: { orderBy: { revisionNumber: "desc" as const }, take: 1, include: revisionRelations } };
async function catalogs(tx: Prisma.TransactionClient, input: KpiConfigurationBody, _definitionName?: string) {
  const byEntity = input.evaluationScope === "BY_SUBJECT" || input.goalMode === "BY_SUBJECT";
  const first = byEntity && input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? input.subjectGoals[0] : undefined;
  const resultUnitSymbol = first ? (input.periodScope === "CURRENT_PERIOD" ? first.goalUnit ?? input.measurementUnit : first.resultUnit ?? input.measurementUnit) : input.measurementUnit;
  const goalUnitSymbol = first?.goalUnit ?? input.goalUnit ?? (input.periodScope === "CURRENT_PERIOD" ? resultUnitSymbol : "%");
  const rowSymbols = byEntity ? input.subjectGoals.flatMap(item => [item.goalUnit ?? goalUnitSymbol, input.periodScope === "CURRENT_PERIOD" ? item.goalUnit ?? goalUnitSymbol : item.resultUnit ?? resultUnitSymbol]) : [];
  const inputUnitSymbols = [...new Set([...input.measurementInputs.map(item => item.unit), ...rowSymbols.filter(symbol => symbol !== resultUnitSymbol && symbol !== goalUnitSymbol)])];
  const [unit, goalUnit, groupGoalUnit, inputUnits, source, frequency, status, evaluation, levels] = await Promise.all([
    tx.measurementUnit.findFirst({ where: { symbol: resultUnitSymbol, isActive: true } }),
    tx.measurementUnit.findFirst({ where: { symbol: goalUnitSymbol, isActive: true } }),
    input.groupGoal ? tx.measurementUnit.findFirst({ where: { symbol: input.groupGoal.unit, isActive: true } }) : Promise.resolve(null),
    tx.measurementUnit.findMany({ where: { symbol: { in: inputUnitSymbols }, isActive: true } }),
    tx.dataSource.findFirst({ where: { name: input.dataSource, isActive: true } }),
    tx.inputFrequency.findUnique({ where: { code: input.inputFrequencyCode } }), tx.kpiConfigurationStatus.findUnique({ where: { code: input.isActive ? "CONFIGURED" : "INACTIVE" } }),
    tx.evaluationType.findUnique({ where: { code: input.evaluationTypeCode ?? "HIGHER_IS_BETTER" } }), tx.trafficLightLevel.findMany({ where: { code: { in: ["RED", "YELLOW", "GREEN"] } } }),
  ]);
  if (!unit || !goalUnit || (input.groupGoal && !groupGoalUnit) || inputUnits.length !== inputUnitSymbols.length || !source || !frequency || !status || !evaluation || levels.length !== 3) throw new AppError("KPI Configuration catalogs are unavailable", 422, "KPI_CONFIGURATION_CATALOG_UNAVAILABLE");
  if (byEntity && input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" && additiveResultError(input.resultSemantics, unit)) throw new AppError("SUM requires an additive Result Unit and semantics", 422, "SUM_REQUIRES_ADDITIVE_RESULT");
  return { unit, goalUnit, groupGoalUnit, inputUnits: [...inputUnits, unit, goalUnit], source, frequency, status, evaluation, levels };
}
async function existing(id: bigint) { const item = await prisma.kpiConfiguration.findFirst({ where: { id, deletedAt: null }, include }); if (!item) throw new AppError("KPI Configuration not found", 404, "KPI_CONFIGURATION_NOT_FOUND"); return item; }
async function writeThresholds(tx: Prisma.TransactionClient, revisionId: bigint, input: KpiConfigurationBody, levels: { id: bigint; code: string }[]) {
  const values: Record<string, [number, number]> = { RED: [input.ranges.redFrom, input.ranges.redTo], YELLOW: [input.ranges.yellowFrom, input.ranges.yellowTo], GREEN: [input.ranges.greenFrom, input.ranges.greenTo] };
  await tx.kpiConfigurationRevisionThreshold.createMany({ data: ["RED", "YELLOW", "GREEN"].map((code, index) => { const range = values[code]!; return { kpiConfigurationRevisionId: revisionId, trafficLightLevelId: levels.find((level) => level.code === code)!.id, rangeMinPercent: range[0], rangeMaxPercent: range[1], includesMin: true, includesMax: true, displayOrder: index + 1 }; }) });
}
async function writeRevision(tx: Prisma.TransactionClient, configurationId: bigint, revisionNumber: number, input: KpiConfigurationBody, evaluationId: bigint, measurementUnitId: bigint, goalUnitId: bigint, groupGoalUnitId: bigint | null, inputUnits: { id: bigint; symbol: string }[], dataSourceId: bigint, levels: { id: bigint; code: string }[], effectiveFrom = new Date()) {
  const evaluationScope = input.evaluationScope === "BY_SUBJECT" || input.goalMode === "BY_SUBJECT" ? "BY_SUBJECT" : "OVERALL";
  const goalType = "SINGLE_VALUE" as const;
  const legacyGoalMode = evaluationScope === "BY_SUBJECT" ? "BY_SUBJECT" : "SINGLE";
  if (input.configurationName || input.classification) input = {...input, scoringRuleConfig: {...input.scoringRuleConfig, configurationMetadata: {name: input.configurationName, classification: input.classification}}};
  const revision = await tx.kpiConfigurationRevision.create({ data: { kpiConfigurationId: configurationId, revisionNumber, targetValue: input.goal, evaluationTypeId: evaluationId, measurementUnitId, goalUnitId, groupGoalValue: input.groupGoal?.value ?? null, groupGoalUnitId, groupGoalLabel: input.groupGoal?.label ?? null, dataSourceId, resultSemantics: input.resultSemantics, periodScope: input.periodScope, comparisonMode: input.periodScope === "CURRENT_PERIOD" ? "NONE" : input.periodScope, comparisonDirection: input.comparisonDirection, calculationPattern: input.resultMethod === "DIRECT" ? "DIRECT" : "DERIVED", calculationTemplate: input.resultMethod === "DIRECT" ? null : input.calculationTemplate, evaluationScope, entityEvaluationMode: evaluationScope === "BY_SUBJECT" ? input.entityEvaluationMode ?? "INDIVIDUAL" : null, goalType, goalAssignment: evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? input.goalAssignment : null, resultMethod: input.resultMethod, goalMode: legacyGoalMode, targetKind: input.targetKind, rangeMinValue: input.rangeMinGoal, rangeMaxValue: input.rangeMaxGoal, subjectType: evaluationScope === "BY_SUBJECT" ? input.subjectType : null, scoringMethod: input.scoringMethod, scoringRuleConfig: input.scoringRuleConfig === null ? Prisma.JsonNull : input.scoringRuleConfig as Prisma.InputJsonValue, scoringRuleConfigVersion: input.scoringRuleConfigVersion, negativeResultPolicy: input.negativeResultPolicy, scoringApprovalStatus: input.scoringApprovalStatus, effectiveFrom, changeReason: revisionNumber === 1 ? "Initial configuration" : input.changeReason } });
  await writeThresholds(tx, revision.id, input, levels);
  if (evaluationScope === "BY_SUBJECT") {
    await tx.kpiConfigurationRevisionSubject.createMany({ data: input.subjects.map((item, index) => ({ kpiConfigurationRevisionId: revision.id, subjectType: input.subjectType!, subjectExternalId: item.subjectExternalId, subjectCodeSnapshot: item.subjectCode, subjectLabelSnapshot: item.subjectLabel, displayOrder: index + 1 })) });
    if (input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL") await tx.kpiConfigurationRevisionSubjectGoal.createMany({ data: input.subjects.map((subject, index) => {
      const item = input.subjectGoals.find(row => row.subjectExternalId === subject.subjectExternalId);
      const rowGoalUnitId = item?.goalUnit ? inputUnits.find(unit => unit.symbol === item.goalUnit)!.id : goalUnitId;
      const rowResultUnitId = input.periodScope === "CURRENT_PERIOD" ? rowGoalUnitId : item?.resultUnit ? inputUnits.find(unit => unit.symbol === item.resultUnit)!.id : measurementUnitId;
      return { kpiConfigurationRevisionId: revision.id, subjectType: input.subjectType!, subjectExternalId: subject.subjectExternalId, subjectCodeSnapshot: subject.subjectCode, subjectLabelSnapshot: subject.subjectLabel, goalValue: input.goalAssignment === "SAME_GOAL_FOR_ALL" ? input.goal : item!.goal, goalUnitId: rowGoalUnitId, resultUnitId: rowResultUnitId, displayOrder: index + 1 };
    }) });
  }
  if (input.resultMethod === "CALCULATED_FROM_INPUTS") await tx.kpiConfigurationRevisionMeasurementInput.createMany({ data: input.measurementInputs.map((item, index) => ({ kpiConfigurationRevisionId: revision.id, inputName: item.name, inputUnitId: inputUnits.find((unit) => unit.symbol === item.unit)!.id, description: item.description || null, displayOrder: index + 1 })) });
}
const auditFields = ["configurationName","classification","goal","ranges","evaluationScope","entityEvaluationMode","goalType","goalAssignment","goalUnit","rangeMinGoal","rangeMaxGoal","subjectType","subjects","subjectGoals","groupGoal","measurementUnit","resultMethod","measurementInputs","calculationTemplate","dataSource","inputFrequencyCode","periodScope","comparisonDirection","calculationPattern","resultSemantics","evaluationTypeCode","targetKind","scoringMethod","scoringRuleConfig","negativeResultPolicy","isActive"] as const;
function auditSnapshot(input: Record<string, any>) {
  const entityEvaluationMode = input.evaluationScope === "BY_SUBJECT" || input.goalMode === "BY_SUBJECT" ? input.entityEvaluationMode ?? "INDIVIDUAL" : null;
  const normalized = { ...input, entityEvaluationMode } as Record<string, any>;
  return Object.fromEntries(auditFields.map((field) => [field, normalized[field] ?? null]));
}
function revisionInputSnapshot(record: any, revision: any) {
  const level = (code: string) => revision?.thresholds?.find((item: any) => item.trafficLightLevel.code === code);
  return auditSnapshot({ configurationName:revision?.scoringRuleConfig?.configurationMetadata?.name, classification:revision?.scoringRuleConfig?.configurationMetadata?.classification, evaluationScope:revision?.evaluationScope, entityEvaluationMode:revision?.entityEvaluationMode ?? (revision?.evaluationScope === "BY_SUBJECT" ? "INDIVIDUAL" : null), goalAssignment:revision?.goalAssignment, groupGoal:revision?.groupGoalValue == null ? null : {value:Number(revision.groupGoalValue),unit:revision.groupGoalUnit?.symbol,label:revision.groupGoalLabel}, goal: Number(revision?.targetValue ?? 0), ranges: { redFrom:Number(level("RED")?.rangeMinPercent ?? 0),redTo:Number(level("RED")?.rangeMaxPercent ?? 0),yellowFrom:Number(level("YELLOW")?.rangeMinPercent ?? 0),yellowTo:Number(level("YELLOW")?.rangeMaxPercent ?? 0),greenFrom:Number(level("GREEN")?.rangeMinPercent ?? 0),greenTo:Number(level("GREEN")?.rangeMaxPercent ?? 0) }, goalMode:revision?.goalMode,rangeMinGoal:revision?.rangeMinValue === null ? null : Number(revision?.rangeMinValue),rangeMaxGoal:revision?.rangeMaxValue === null ? null : Number(revision?.rangeMaxValue),subjectType:revision?.subjectType,subjects:(revision?.subjects ?? []).map((item:any)=>({subjectExternalId:item.subjectExternalId,subjectCode:item.subjectCodeSnapshot,subjectLabel:item.subjectLabelSnapshot})),subjectGoals:(revision?.subjectGoals ?? []).map((item:any)=>({subjectExternalId:item.subjectExternalId,subjectCode:item.subjectCodeSnapshot,subjectLabel:item.subjectLabelSnapshot,goal:Number(item.goalValue),goalUnit:(item.goalUnit ?? revision.goalUnit)?.symbol,resultUnit:(item.resultUnit ?? revision.measurementUnit)?.symbol})),measurementUnit:revision?.measurementUnit?.symbol ?? record.measurementUnit.symbol,dataSource:revision?.dataSource?.name ?? record.primaryDataSource.name,inputFrequencyCode:record.inputFrequency.code,periodScope:revision?.periodScope,comparisonDirection:revision?.comparisonDirection,calculationPattern:revision?.calculationPattern,calculationTemplate:revision?.calculationTemplate,resultSemantics:revision?.resultSemantics,evaluationTypeCode:revision?.evaluationType?.code,targetKind:revision?.targetKind,scoringMethod:revision?.scoringMethod,scoringRuleConfig:revision?.scoringRuleConfig,negativeResultPolicy:revision?.negativeResultPolicy,isActive:record.status.code !== "INACTIVE" });
}
function changeClassification(changedFields:string[]) { const structural = new Set(["goalMode","evaluationScope","entityEvaluationMode","subjects","subjectType","subjectGoals","measurementUnit","inputFrequencyCode","periodScope","calculationPattern","resultSemantics"]); return changedFields.some((field)=>structural.has(field)) ? "STRUCTURAL_CHANGE" : "VALUE_CHANGE"; }
function nextPeriodStart(today: Date, monthsPerPeriod: number) {
  const periodStartMonth = Math.floor(today.getUTCMonth() / monthsPerPeriod) * monthsPerPeriod;
  return new Date(Date.UTC(today.getUTCFullYear(), periodStartMonth + monthsPerPeriod, 1));
}
async function hasPoolMembership(id: bigint): Promise<boolean> {
  try {
    const base = process.env.KPI_POOL_BASE_URL ?? (existsSync("/.dockerenv") ? "http://exa-kpi-pool-service:4002" : "http://localhost:4002");
    const response = await fetch(base.replace(/\/$/, "") + "/api/v1/kpi-pools/kpi-configuration-usage", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({configurationIds:[id.toString()]}),signal:AbortSignal.timeout(5000)});
    if(!response.ok) throw new Error("Pool usage unavailable");
    const body = await response.json() as {data?:Array<{configurationId:string;usedIn:number}>};
    const usage = body.data?.find(row=>row.configurationId===id.toString());
    if(!usage || !Number.isInteger(usage.usedIn) || usage.usedIn < 0) throw new Error("Invalid pool usage");
    return usage.usedIn > 0;
  } catch { throw new AppError("Could not confirm Pool assignments. Retry when KPI Pools is available.",503,"KPI_POOL_USAGE_UNAVAILABLE"); }
}
async function nextConfigCode(tx: Prisma.TransactionClient, definitionId: bigint, definitionCode: string) {
  const definitionNumber = definitionCode.replace(/\D/g, "").padStart(3, "0");
  const siblings = await tx.kpiConfiguration.findMany({ where: { kpiDefinitionId: definitionId }, select: { configCode: true } });
  const highestSuffix = siblings.reduce((highest, sibling) => {
    const match = new RegExp(`^KPC-${definitionNumber}-(\\d+)$`).exec(sibling.configCode);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `KPC-${definitionNumber}-${String(highestSuffix + 1).padStart(2, "0")}`;
}
async function createConfiguration(tx: Prisma.TransactionClient, input: KpiConfigurationBody, actor: bigint | null) {
  await tx.$queryRaw`SELECT kpi_definition_id FROM kpi_definitions WHERE kpi_definition_id = ${BigInt(input.definitionId)} FOR UPDATE`;
  if(input.classification) {
    const type = await tx.subjectTypeCatalog.findFirst({where:{code:input.classification.subjectType,isActive:true}});
    const subject = await tx.kpiConfigurationSubjectCatalog.findFirst({where:{subjectType:input.classification.subjectType,externalId:input.classification.subjectExternalId,isActive:true}});
    if(!type || !subject) throw new AppError("Select an active Subject Type and Subject Value",422,"SUBJECT_NOT_AVAILABLE");
    const siblings = await tx.kpiConfiguration.findMany({
      where: { kpiDefinitionId: BigInt(input.definitionId), deletedAt: null, status: { code: { not: "INACTIVE" } } },
      select: { id: true, configCode: true, revisions: { orderBy: { revisionNumber: "desc" }, take: 1, select: { scoringRuleConfig: true } } },
    });
    const duplicate = siblings.find(sibling => {
      const classification = (sibling.revisions[0]?.scoringRuleConfig as any)?.configurationMetadata?.classification;
      return classification?.subjectType === subject.subjectType && classification?.subjectExternalId === subject.externalId;
    });
    if (duplicate) throw new AppError(subject.name + " already has a configuration (" + duplicate.configCode + ")", 409, "SUBJECT_CONFIGURATION_ALREADY_EXISTS", { configurationId: duplicate.id.toString(), configCode: duplicate.configCode });
    input = {...input, classification:{subjectType:subject.subjectType,subjectExternalId:subject.externalId,subjectCode:subject.code,subjectLabel:subject.name}};
  }
          const definition = await tx.kpiDefinition.findFirst({ where: { id: BigInt(input.definitionId), deletedAt: null, isActive: true } });
          if (!definition) throw new AppError("Active KPI Definition not found",422,"KPI_DEFINITION_NOT_AVAILABLE");
          const c = await catalogs(tx,input,definition.kpiName);
          const configCode = await nextConfigCode(tx, definition.id, definition.kpiCode);
          const created = await tx.kpiConfiguration.create({data:{kpiDefinitionId:definition.id,configCode,measurementUnitId:c.unit.id,inputFrequencyId:c.frequency.id,primaryDataSourceId:c.source.id,kpiConfigurationStatusId:c.status.id,createdByUserId:actor}});
          await writeRevision(tx,created.id,1,input,c.evaluation.id,c.unit.id,c.goalUnit.id,c.groupGoalUnit?.id ?? null,c.inputUnits,c.source.id,c.levels,input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : new Date());
          return toKpiConfigurationDto(await tx.kpiConfiguration.findUniqueOrThrow({where:{id:created.id},include}));
}
export const kpiConfigurationService = {
  async quickConfigure(configurations: KpiConfigurationBody[], actor: bigint | null) {
    return prisma.$transaction(async tx => {
      const results = [];
      for (const input of configurations) results.push(await createConfiguration(tx, input, actor));
      return results;
    }, {timeout:30000, isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  },
  async lookups() {
    const [measurementUnits, inputFrequencies, dataSources, subjectCatalogs] = await Promise.all([
      prisma.measurementUnit.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, symbol: true, isPercentage: true } }),
      prisma.inputFrequency.findMany({ where: { isActive: true }, orderBy: { monthsPerPeriod: "asc" }, select: { id: true, code: true, name: true, monthsPerPeriod: true, periodsPerYear: true } }),
      prisma.dataSource.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, sourceType: true } }),
      prisma.kpiConfigurationSubjectCatalog.findMany({ where: { isActive: true }, orderBy: [{ subjectType: "asc" }, { displayOrder: "asc" }], select: { id: true, subjectType: true, externalId: true, code: true, name: true } }),
    ]);
    return { measurementUnits: measurementUnits.map((item) => ({ ...item, id: item.id.toString() })), inputFrequencies: inputFrequencies.map((item) => ({ ...item, id: item.id.toString() })), dataSources: dataSources.map((item) => ({ ...item, id: item.id.toString() })), subjectCatalogs: subjectCatalogs.map((item) => ({ id: item.externalId, catalogId: item.id.toString(), subjectType: item.subjectType, code: item.code, name: item.name })) };
  },
  async effectiveSnapshots(input: EffectiveKpiConfigurationSnapshotsBody) {
    const periodStart = new Date(`${input.periodStart}T00:00:00.000Z`);
    const periodEnd = new Date(`${input.periodEnd}T00:00:00.000Z`);
    const records = await prisma.kpiConfiguration.findMany({
      where: { id: { in: input.configurationIds.map(BigInt) }, deletedAt: null },
      select: {
        id: true, configCode: true, status: { select: { code: true } }, inputFrequency: { select: { id: true, code: true, monthsPerPeriod: true } },
        definition: { select: { id: true, kpiCode: true, kpiName: true, description: true } },
        revisions: { where: { effectiveFrom: { lte: periodStart }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodEnd } }] }, orderBy: { revisionNumber: "asc" }, include: { ...revisionRelations, thresholds: { orderBy: { displayOrder: "asc" }, include: { trafficLightLevel: true } } } },
      },
    });
    const byId = new Map(records.map((record) => [record.id.toString(), record]));
    const missing = input.configurationIds.filter((id) => !byId.has(id));
    if (missing.length) throw new AppError("One or more KPI Configurations do not exist", 422, "KPI_CONFIGURATION_NOT_FOUND", { configurationIds: missing });
    const uncovered = records.filter((record) => record.revisions.length === 0).map((record) => record.id.toString());
    if (uncovered.length) throw new AppError("A KPI Configuration has no revision covering the complete Input Period", 409, "KPI_EFFECTIVE_REVISION_NOT_FOUND", { periodStart: input.periodStart, periodEnd: input.periodEnd, configurationIds: uncovered });
    const overlapping = records.filter((record) => record.revisions.length > 1).map((record) => ({ configurationId: record.id.toString(), effectiveRevisionCount: record.revisions.length }));
    if (overlapping.length) throw new AppError("A KPI Configuration has overlapping revisions for the Input Period", 409, "KPI_EFFECTIVE_REVISION_OVERLAP", { periodStart: input.periodStart, periodEnd: input.periodEnd, configurations: overlapping });
    return { data: input.configurationIds.map((id) => {
      const record = byId.get(id)!; const revision = record.revisions[0]!;
      const snapshot = {
        kpiConfigurationId: id, kpiConfigurationRevisionId: revision.id.toString(), revisionNumber: revision.revisionNumber,
        effectiveFrom: revision.effectiveFrom.toISOString().slice(0, 10), effectiveTo: revision.effectiveTo?.toISOString().slice(0, 10) ?? null,
        configCode: record.configCode, kpiDefinitionId: record.definition.id.toString(), kpiCode: record.definition.kpiCode, kpiName: configurationDisplayName(record, revision), objective: record.definition.description,
        periodScope: revision.periodScope, comparisonMode: revision.comparisonMode, comparisonDirection: revision.comparisonDirection, targetKind: revision.targetKind,
        historicalCapabilityVersion: revision.periodScope === "CURRENT_PERIOD" ? null : "HISTORICAL_COMPARISON_V1",
        inputFrequency: { id: record.inputFrequency.id.toString(), code: record.inputFrequency.code, monthsPerPeriod: record.inputFrequency.monthsPerPeriod },
        goal: revision.targetValue?.toString() ?? null, goalMode: revision.goalMode, rangeMinGoal: revision.rangeMinValue?.toString() ?? null, rangeMaxGoal: revision.rangeMaxValue?.toString() ?? null, subjectType: revision.subjectType,
        evaluationScope: revision.evaluationScope, entityEvaluationMode: revision.evaluationScope === "BY_SUBJECT" ? revision.entityEvaluationMode ?? "INDIVIDUAL" : null, goalType: revision.goalType, goalAssignment: revision.goalAssignment,
        goalUnit: { id: (revision.goalUnit ?? revision.measurementUnit).id.toString(), code: (revision.goalUnit ?? revision.measurementUnit).code, name: (revision.goalUnit ?? revision.measurementUnit).name, symbol: (revision.goalUnit ?? revision.measurementUnit).symbol },
        resultMethod: revision.resultMethod, calculationPattern: revision.calculationPattern, calculationTemplate: revision.calculationTemplate,
        measurementInputs: (revision.measurementInputs ?? []).map((item) => ({ name: item.inputName, unit: item.inputUnit.symbol, description: item.description ?? "" })),
        subjects: (revision.subjects ?? []).map((item) => ({ subjectExternalId: item.subjectExternalId, subjectCode: item.subjectCodeSnapshot, subjectLabel: item.subjectLabelSnapshot })),
        subjectGoals: (revision.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? [] : revision.subjects ?? []).map((subject) => { const override = revision.subjectGoals.find((item) => item.subjectExternalId === subject.subjectExternalId); return { subjectExternalId: subject.subjectExternalId, subjectCode: subject.subjectCodeSnapshot, subjectLabel: subject.subjectLabelSnapshot, goal: (override?.goalValue ?? revision.targetValue)?.toString() ?? null, goalUnit: unitSnapshot(override?.goalUnit ?? revision.goalUnit ?? revision.measurementUnit), resultUnit: unitSnapshot(override?.resultUnit ?? revision.measurementUnit) }; }),
        entityAggregation: revision.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? "SUM" : null,
        groupGoal: revision.groupGoalValue == null ? null : { value: revision.groupGoalValue.toString(), unit: revision.groupGoalUnit?.symbol ?? "", label: revision.groupGoalLabel ?? "" },
        evaluationType: { id: revision.evaluationType.id.toString(), code: revision.evaluationType.code, name: revision.evaluationType.name },
        resultSemantics: revision.resultSemantics, scoringMethod: revision.scoringMethod, scoringRuleConfig: revision.scoringRuleConfig,
        scoringRuleConfigVersion: revision.scoringRuleConfigVersion, negativeResultPolicy: revision.negativeResultPolicy, scoringApprovalStatus: revision.scoringApprovalStatus,
        measurementUnit: { id: revision.measurementUnit.id.toString(), code: revision.measurementUnit.code, name: revision.measurementUnit.name, symbol: revision.measurementUnit.symbol },
        dataSource: { id: revision.dataSource.id.toString(), code: revision.dataSource.code, name: revision.dataSource.name },
        thresholds: revision.thresholds.map((threshold) => {
          const next = revision.thresholds.find(row => row.displayOrder === threshold.displayOrder + 1);
          // The form displays whole-percent ranges; execution must also cover decimal compliance.
          const consecutive = next && threshold.rangeMaxPercent.plus(1).eq(next.rangeMinPercent);
          return { id: threshold.id.toString(), trafficLightLevelId: threshold.trafficLightLevel.id.toString(), code: threshold.trafficLightLevel.code, name: threshold.trafficLightLevel.name, rangeMinPercent: threshold.rangeMinPercent.toString(), rangeMaxPercent: (consecutive ? next.rangeMinPercent : threshold.rangeMaxPercent).toString(), includesMin: threshold.includesMin, includesMax: consecutive ? false : threshold.includesMax, displayOrder: threshold.displayOrder };
        }),
      };
      return { ...snapshot, contractVersion: "EffectiveKpiSettingsV1", executability: evaluateKpiExecutability({ active: record.status.code === "CONFIGURED", evaluationScope: revision.evaluationScope, entityEvaluationMode: revision.evaluationScope === "BY_SUBJECT" ? revision.entityEvaluationMode ?? "INDIVIDUAL" : null, periodScope: revision.periodScope, comparisonDirection: revision.comparisonDirection, targetKind: revision.targetKind, scoringRuleConfig: revision.scoringRuleConfig, monthsPerPeriod: record.inputFrequency.monthsPerPeriod, goal: snapshot.goal, goalMode: revision.goalMode, goalUnit: snapshot.goalUnit, measurementUnit: snapshot.measurementUnit, dataSource: snapshot.dataSource, frequencyCode: record.inputFrequency.code, evaluationType: snapshot.evaluationType, resultSemantics: revision.resultSemantics, scoringMethod: revision.scoringMethod, scoringApprovalStatus: revision.scoringApprovalStatus, resultMethod: revision.resultMethod, calculationTemplate: revision.calculationTemplate, measurementInputs: revision.measurementInputs.map(i => ({name: i.inputName, unit: i.inputUnit.symbol})), subjectType: revision.subjectType, subjects: snapshot.subjects, subjectGoals: snapshot.subjectGoals, groupGoal: snapshot.groupGoal, thresholds: snapshot.thresholds }) };
    }) };
  },
  async internalCatalog(query: InternalKpiConfigurationCatalogQuery) {
    const where: Prisma.KpiConfigurationWhereInput = {
      deletedAt: null,
      ...(query.search ? { OR: [
        { configCode: { contains: query.search } },
        { definition: { is: { kpiCode: { contains: query.search } } } },
        { definition: { is: { kpiName: { contains: query.search } } } },
      ] } : {}),
    };
    const [records, totalItems] = await prisma.$transaction([
      prisma.kpiConfiguration.findMany({
        where,
        orderBy: [{ configCode: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true, configCode: true, kpiDefinitionId: true, inputFrequencyId: true,
          status: { select: { code: true } },
          definition: { select: { kpiCode: true, kpiName: true, isActive: true, statusCode: true, deletedAt: true, category: { select: { name: true } } } },
          inputFrequency: { select: { id: true, code: true, name: true, isActive: true, monthsPerPeriod: true } },
          measurementUnit: { select: { symbol: true, name: true } },
          primaryDataSource: { select: { name: true } },
          revisions: { orderBy: { revisionNumber: "desc" }, take: 1, select: { scoringRuleConfig: true, targetValue: true, evaluationScope: true, entityEvaluationMode: true, scoringApprovalStatus: true, groupGoalValue: true, measurementUnit: { select: { symbol: true, name: true } }, goalUnit: { select: { symbol: true } }, groupGoalUnit: { select: { symbol: true } }, subjects: { select: { id: true } }, subjectGoals: { select: { id: true } }, dataSource: { select: { name: true } } } },
        },
      }),
      prisma.kpiConfiguration.count({ where }),
    ]);
    return {
      data: records.map((record) => ({
        id: record.id.toString(), configCode: record.configCode,
        definitionId: record.kpiDefinitionId.toString(), definitionCode: record.definition.kpiCode,
        definitionName: configurationDisplayName(record), configurationName: configurationDisplayName(record), sourceDefinitionName: record.definition.kpiName, classification: (record.revisions[0]?.scoringRuleConfig as any)?.configurationMetadata?.classification ?? null, definitionIsActive: record.definition.isActive && record.definition.statusCode === "ACTIVE" && record.definition.deletedAt === null,
        categoryName: record.definition.category?.name ?? "Not specified",
        inputFrequencyId: record.inputFrequencyId.toString(), inputFrequencyCode: record.inputFrequency.code,
        inputFrequencyName: record.inputFrequency.name, inputFrequencyIsActive: record.inputFrequency.isActive,
        measurementUnit: record.revisions[0]?.measurementUnit?.symbol || record.revisions[0]?.measurementUnit?.name || record.measurementUnit?.symbol || record.measurementUnit?.name || "Not specified",
        entityEvaluationMode: record.revisions[0]?.entityEvaluationMode ?? (record.revisions[0]?.evaluationScope === "BY_SUBJECT" ? "INDIVIDUAL" : null),
        evaluationScope: record.revisions[0]?.evaluationScope ?? "OVERALL",
        goalUnit: record.revisions[0]?.goalUnit?.symbol ?? record.revisions[0]?.measurementUnit?.symbol ?? record.measurementUnit?.symbol ?? "",
        subjectGoalCount: record.revisions[0]?.subjects.length ?? 0,
        groupGoal: record.revisions[0]?.groupGoalValue == null ? null : { value: record.revisions[0].groupGoalValue.toString(), unit: record.revisions[0].groupGoalUnit?.symbol ?? "" },
        dataSource: record.revisions[0]?.dataSource?.name ?? record.primaryDataSource?.name ?? "Not specified",
        goal: record.revisions[0]?.targetValue?.toString() ?? null, scoringApprovalStatus: record.revisions[0]?.scoringApprovalStatus ?? "BLOCKED",
        status: record.status.code, isActive: record.status.code !== "INACTIVE",
      })),
      meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) },
    };
  },
  async batchLookup(input: BatchLookupKpiConfigurationsBody) {
    const requestedIds = input.ids.map(BigInt);
    const records = await prisma.kpiConfiguration.findMany({
      where: { id: { in: requestedIds }, deletedAt: null },
      select: {
        id: true,
        configCode: true,
        kpiDefinitionId: true,
        inputFrequencyId: true,
        status: { select: { code: true } },
        definition: { select: { kpiCode: true, kpiName: true, isActive: true, statusCode: true, deletedAt: true, category: { select: { name: true } } } },
        inputFrequency: { select: { id: true, code: true, name: true, isActive: true, monthsPerPeriod: true } },
        measurementUnit: { select: { symbol: true, name: true } },
        primaryDataSource: { select: { name: true } },
        revisions: { orderBy: { revisionNumber: "desc" }, take: 1, include: revisionRelations },
      },
    });
    const byId = new Map(records.map((record) => [record.id.toString(), record]));
    return {
      data: input.ids.flatMap((id) => {
        const record = byId.get(id);
        const revision = record?.revisions[0];
        const executability = record && revision ? evaluateKpiExecutability({ active: record.status.code === "CONFIGURED", evaluationScope: revision.evaluationScope, entityEvaluationMode: revision.evaluationScope === "BY_SUBJECT" ? revision.entityEvaluationMode ?? "INDIVIDUAL" : null, periodScope: revision.periodScope, comparisonDirection: revision.comparisonDirection, targetKind: revision.targetKind, scoringRuleConfig: revision.scoringRuleConfig, monthsPerPeriod: record.inputFrequency.monthsPerPeriod, goal: revision.targetValue?.toString() ?? null, goalMode: revision.goalMode, goalUnit: revision.goalUnit, measurementUnit: revision.measurementUnit, dataSource: revision.dataSource, frequencyCode: record.inputFrequency.code, evaluationType: revision.evaluationType, resultSemantics: revision.resultSemantics, scoringMethod: revision.scoringMethod, scoringApprovalStatus: revision.scoringApprovalStatus, resultMethod: revision.resultMethod, calculationTemplate: revision.calculationTemplate, measurementInputs: revision.measurementInputs.map(i => ({name: i.inputName, unit: i.inputUnit.symbol})), subjectType: revision.subjectType, subjects: revision.subjects.map((item) => ({ subjectExternalId: item.subjectExternalId })), subjectGoals: (revision.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? [] : revision.subjects).map((subject) => ({ subjectExternalId: subject.subjectExternalId, goal: (revision.subjectGoals.find((item) => item.subjectExternalId === subject.subjectExternalId)?.goalValue ?? revision.targetValue)?.toString() ?? null, goalUnit: revision.subjectGoals.find(item => item.subjectExternalId === subject.subjectExternalId)?.goalUnit ?? revision.goalUnit, resultUnit: revision.subjectGoals.find(item => item.subjectExternalId === subject.subjectExternalId)?.resultUnit ?? revision.measurementUnit })), groupGoal: revision.groupGoalValue == null ? null : { value: revision.groupGoalValue.toString() }, thresholds: revision.thresholds.map((item) => ({ code: item.trafficLightLevel.code, rangeMinPercent: item.rangeMinPercent.toString(), rangeMaxPercent: item.rangeMaxPercent.toString() })) }) : null;
        return record ? [{
          id,
          configCode: record.configCode,
          definitionId: record.kpiDefinitionId.toString(),
          definitionCode: record.definition.kpiCode,
          definitionName: configurationDisplayName(record), configurationName: configurationDisplayName(record), sourceDefinitionName: record.definition.kpiName, classification: (record.revisions[0]?.scoringRuleConfig as any)?.configurationMetadata?.classification ?? null,
          categoryName: record.definition.category?.name ?? "Not specified",
          definitionIsActive: record.definition.isActive && record.definition.statusCode === "ACTIVE" && record.definition.deletedAt === null,
          inputFrequencyId: record.inputFrequencyId.toString(),
          inputFrequencyCode: record.inputFrequency.code,
          inputFrequencyName: record.inputFrequency.name,
          inputFrequencyIsActive: record.inputFrequency.isActive,
          measurementUnit: record.revisions?.[0]?.measurementUnit?.symbol || record.revisions?.[0]?.measurementUnit?.name || record.measurementUnit?.symbol || record.measurementUnit?.name || "Not specified",
          dataSource: record.revisions?.[0]?.dataSource?.name ?? record.primaryDataSource?.name ?? "Not specified",
          goal: record.revisions?.[0]?.evaluationScope === "BY_SUBJECT" && record.revisions?.[0]?.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? `By Entity · ${record.revisions[0].subjectGoals.length} goals${record.revisions[0].groupGoalValue == null ? "" : ` · Group ${record.revisions[0].groupGoalValue.toString()} ${record.revisions[0].groupGoalUnit?.symbol ?? ""}`}` : record.revisions?.[0]?.targetValue?.toString() ?? null,
          entityEvaluationMode: record.revisions?.[0]?.entityEvaluationMode ?? (record.revisions?.[0]?.evaluationScope === "BY_SUBJECT" ? "INDIVIDUAL" : null),
          evaluationScope: record.revisions?.[0]?.evaluationScope ?? "OVERALL",
          goalUnit: record.revisions?.[0]?.goalUnit?.symbol ?? record.revisions?.[0]?.measurementUnit?.symbol,
          subjectGoalCount: record.revisions?.[0]?.subjects.length ?? 0,
          groupGoal: record.revisions?.[0]?.groupGoalValue == null ? null : { value: record.revisions[0].groupGoalValue.toString(), unit: record.revisions[0].groupGoalUnit?.symbol ?? "" },
          status: record.status.code,
          isActive: record.status.code === "CONFIGURED",
          executability,
        }] : [];
      }),
      notFoundIds: input.ids.filter((id) => !byId.has(id)),
    };
  },
  async list(query: { page: number; pageSize: number; search?: string }) {
    const configurationWhere: Prisma.KpiConfigurationWhereInput = {
      deletedAt: null,
      ...(query.search ? { OR: [{ configCode: { contains: query.search } }, { definition: { is: { kpiCode: { contains: query.search } } } }, { definition: { is: { kpiName: { contains: query.search } } } }] } : {}),
    };
    const definitionWhere: Prisma.KpiDefinitionWhereInput = {
      deletedAt: null,
      isActive: true,
      statusCode: "ACTIVE",
      configurations: { none: { deletedAt: null } },
      ...(query.search ? { OR: [{ kpiCode: { contains: query.search } }, { kpiName: { contains: query.search } }] } : {}),
    };
    const [configured, incompleteDefinitions] = await Promise.all([
      prisma.kpiConfiguration.findMany({ where: configurationWhere, include, orderBy: { createdAt: "desc" } }),
      prisma.kpiDefinition.findMany({ where: definitionWhere, orderBy: { createdAt: "desc" } }),
    ]);
    const incomplete = incompleteDefinitions.map((definition) => ({
      id: -Number(definition.id),
      code: "",
      definitionId: Number(definition.id),
      definitionCode: definition.kpiCode,
      definitionName: definition.kpiName,
      goal: 0,
      measurementUnit: "",
      evaluationType: "",
      dataSource: "",
      ranges: { redFrom: 0, redTo: 0, yellowFrom: 0, yellowTo: 0, greenFrom: 0, greenTo: 0 },
      usedIn: 0,
      status: "INCOMPLETE",
      isActive: true,
      createdAt: definition.createdAt.toISOString(),
      createdBy: "System",
      updatedAt: (definition.updatedAt ?? definition.createdAt).toISOString(),
      updatedBy: "System",
      poolNames: [],
    }));
    const allItems = [...incomplete, ...configured.map(toKpiConfigurationDto)];
    const start = (query.page - 1) * query.pageSize;
    const data = allItems.slice(start, start + query.pageSize);
    return { data, meta: { page: query.page, pageSize: query.pageSize, totalItems: allItems.length, totalPages: Math.ceil(allItems.length / query.pageSize) } };
  },
  async get(id: bigint) { return toKpiConfigurationDto(await existing(id)); },
  async create(input: KpiConfigurationBody, actor: bigint|null) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          return createConfiguration(tx, input, actor);
        });
      } catch (error) {
        const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!collision || attempt === 2) throw error;
      }
    }
    throw new AppError("KPI Configuration code could not be generated", 409, "KPI_CONFIGURATION_CODE_CONFLICT");
  },
  async update(id: bigint, input: KpiConfigurationBody, actor: bigint | null) {
    const current = await existing(id);
    const metadata = (current.revisions[0]?.scoringRuleConfig as any)?.configurationMetadata;
    input = {...input, configurationName:input.configurationName ?? metadata?.name, classification:input.classification ?? metadata?.classification};
    const assigned = await hasPoolMembership(id);
    const reason = input.changeReason?.trim() || (!assigned ? "Updated unassigned configuration" : "");
    if (!reason || reason.length < 3) throw new AppError("Change Reason is required for a global edit", 422, "KPI_CONFIGURATION_CHANGE_REASON_REQUIRED");
    return prisma.$transaction(async (tx) => {
      const definition = await tx.kpiDefinition.findFirst({ where: { id: BigInt(input.definitionId), deletedAt: null } });
      if (!definition) throw new AppError("KPI Definition not found", 422, "KPI_DEFINITION_NOT_AVAILABLE");
      const c = await catalogs(tx, input, definition.kpiName);
      const latest = await tx.kpiConfigurationRevision.findFirst({ where: { kpiConfigurationId: id }, orderBy: { revisionNumber: "desc" }, include: revisionRelations });
      await tx.kpiConfiguration.update({ where: { id }, data: { measurementUnitId: c.unit.id, inputFrequencyId: c.frequency.id, primaryDataSourceId: c.source.id, kpiConfigurationStatusId: c.status.id, updatedAt: new Date(), updatedByUserId: actor } });
      const now = new Date();
      const schedulingBase = latest && latest.effectiveFrom > now ? latest.effectiveFrom : now;
      const effectiveFrom = !assigned ? latest?.effectiveFrom ?? now : input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : nextPeriodStart(schedulingBase, c.frequency.monthsPerPeriod);
      // Unassigned configurations can replace their draft revision; assigned contracts keep revision history.
      const pendingLatest = !assigned ? latest : input.scoringRuleConfig?.model !== "SINGLE_RESULT_V1" && latest && input.effectiveFrom && effectiveFrom <= latest.effectiveFrom ? latest : null;
      let revisionNumber = (latest?.revisionNumber ?? 0) + 1;
      if (pendingLatest) {
        const previous = await tx.kpiConfigurationRevision.findFirst({ where: { kpiConfigurationId: id, revisionNumber: { lt: pendingLatest.revisionNumber } }, orderBy: { revisionNumber: "desc" } });
        if (previous && effectiveFrom <= previous.effectiveFrom) throw new AppError("Effective From must be after the previous active revision", 409, "KPI_REVISION_EFFECTIVE_FROM_ORDER_CONFLICT");
        await tx.kpiConfigurationChangeAudit.updateMany({ where: { configurationRevisionId: pendingLatest.id }, data: { configurationRevisionId: null } });
        await tx.kpiConfigurationRevision.delete({ where: { id: pendingLatest.id } });
        if (previous) await tx.kpiConfigurationRevision.update({ where: { id: previous.id }, data: { effectiveTo: new Date(effectiveFrom.getTime() - 86_400_000) } });
        revisionNumber = pendingLatest.revisionNumber;
      } else if (latest) {
        if (effectiveFrom <= latest.effectiveFrom) throw new AppError("Effective From must be after the latest revision", 409, "KPI_REVISION_EFFECTIVE_FROM_ORDER_CONFLICT");
        if (!latest.effectiveTo) await tx.kpiConfigurationRevision.update({ where: { id: latest.id }, data: { effectiveTo: new Date(effectiveFrom.getTime() - 86_400_000) } });
      }
      await writeRevision(tx, id, revisionNumber, { ...input, changeReason: reason }, c.evaluation.id, c.unit.id,c.goalUnit.id,c.groupGoalUnit?.id ?? null,c.inputUnits,c.source.id,c.levels, effectiveFrom);
      const written = await tx.kpiConfigurationRevision.findFirstOrThrow({ where: { kpiConfigurationId: id, effectiveFrom }, orderBy: { revisionNumber: "desc" } });
      const oldValues = latest ? revisionInputSnapshot(current, latest) : null;
      const newValues = auditSnapshot(input as unknown as Record<string, any>);
      const changedFields = auditFields.filter((field) => JSON.stringify(oldValues?.[field]) !== JSON.stringify(newValues[field]));
      await tx.kpiConfigurationChangeAudit.create({ data: { kpiConfigurationId: id, configurationRevisionId: written.id, changeSource: "GLOBAL_KPI_MANAGEMENT", effectiveFrom, oldValue: latest ? { revisionId: latest.id.toString(), revisionNumber: latest.revisionNumber, values: oldValues } : Prisma.JsonNull, newValue: { revisionId: written.id.toString(), revisionNumber: written.revisionNumber, classification: changeClassification(changedFields), changedFields, values: newValues }, reason, changedByUserId: actor } });
      return toKpiConfigurationDto(await tx.kpiConfiguration.findUniqueOrThrow({ where: { id }, include }));
    });
  },
  async deactivate(id:bigint,actor:bigint|null){await existing(id);const status=await prisma.kpiConfigurationStatus.findUnique({where:{code:"INACTIVE"}});if(!status)throw new AppError("Inactive status unavailable",422,"KPI_CONFIGURATION_CATALOG_UNAVAILABLE");return toKpiConfigurationDto(await prisma.kpiConfiguration.update({where:{id},data:{kpiConfigurationStatusId:status.id,updatedAt:new Date(),updatedByUserId:actor},include}));},
  async softDelete(id:bigint,actor:bigint|null){await existing(id);return toKpiConfigurationDto(await prisma.kpiConfiguration.update({where:{id},data:{deletedAt:new Date(),updatedAt:new Date(),updatedByUserId:actor},include}));}
};

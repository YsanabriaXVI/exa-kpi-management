import { evaluationUnits } from "../contracts/evaluation-units.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { historicalContractError, isHistorical } from "../contracts/historical-contract.js";
import { parseFrozenEffectiveKpiSettings } from "../contracts/frozen-effective-kpi-settings.js";
import { AppError } from "../utils/app-error.js";
import { clearCurrentScoring, hasCurrentScoring } from "./scoring-validity.js";
import { requiredHistoricalPeriod, type RequiredPeriod } from "./historical-period.js";

const id = z.string().regex(/^[1-9]\d*$/);
export const baselineParams = z.object({ id, inputId: id });
export const baselineQuery = z.object({ query: z.string().trim().max(200).optional(), pool: id.optional(), scorecard: id.optional(),
  page: z.coerce.number().int().min(1).default(1) }).strict();
export const selectedBaselineBody = z.object({ expectedBaselineVersion: z.number().int().nonnegative(), sourceResultId: id }).strict();
export const manualBaselineBody = z.object({ expectedBaselineVersion: z.number().int().nonnegative(),
  value: z.string().trim().regex(/^\d{1,14}(\.\d{1,6})?$/), reason: z.string().trim().min(10).max(10000) }).strict();
type Tx = Prisma.TransactionClient;
const date = (s: string) => new Date(s + "T00:00:00.000Z");
const asJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value, (_key, v) => typeof v === "bigint" ? String(v) : v));
export function resolutionDto(r: any) {
  return { id: String(r.id), revisionNo: r.revisionNo, baselineVersion: r.baselineVersion, referenceType: r.referenceType,
    requiredPeriod: {key: r.requiredPeriodKey, start: r.requiredPeriodStart.toISOString().slice(0,10), end: r.requiredPeriodEnd.toISOString().slice(0,10)},
    sourceType: r.sourceType, state: r.sourceType === "AUTO_MATCH" ? "AUTO_RESOLVED" : r.sourceType === "USER_MATCH" ? "USER_RESOLVED" : "MANUAL",
    value: r.baselineValueSnapshot.toString(), unit: r.baselineUnitSnapshot, sourceResultId: r.sourceResultId?.toString() ?? null,
    provenance: r.provenance, reason: r.reason, resolvedBy: String(r.resolvedByUserId), resolvedAt: r.resolvedAt.toISOString() };
}
export function baselineContext(period: any, input: any, resolution?: any) {
  const frozen = input.effectiveSettingsSnapshot;
  if (!isHistorical(frozen)) return {state: "NOT_REQUIRED", requiredPeriod: null, resolution: null, errorCode: null};
  const invalid = historicalContractError(frozen);
  const requiredPeriod = invalid ? null : requiredHistoricalPeriod(period, frozen);
  return {state: invalid || !requiredPeriod ? "INVALID" : resolution ? resolutionDto(resolution).state : "UNRESOLVED",
    requiredPeriod, resolution: resolution ? resolutionDto(resolution) : null,
    errorCode: invalid ?? (!requiredPeriod ? "HISTORICAL_REQUIRED_PERIOD_NOT_FOUND" : null)};
}
function required(period: any, input: any) {
  parseFrozenEffectiveKpiSettings(input.effectiveSettingsSnapshot);
  if (!isHistorical(input.effectiveSettingsSnapshot)) throw new AppError(422,"BASELINE_NOT_REQUIRED","This evaluation does not require a historical baseline");
  const context = baselineContext(period, input);
  if (!context.requiredPeriod) throw new AppError(422, context.errorCode!, "The required historical period cannot be resolved from frozen context");
  return context.requiredPeriod;
}
async function target(db: Tx, periodId: bigint, inputId: bigint) {
  const period = await db.monitoringPeriod.findUnique({where:{id:periodId},include:{status:true}});
  if (!period) throw new AppError(404,"MONITORING_PERIOD_NOT_FOUND","Monitoring Period was not found");
  const input = await db.monitoringPeriodInput.findFirst({where:{id:inputId,monitoringPeriodId:periodId}});
  if (!input) throw new AppError(404,"MONITORING_INPUT_NOT_FOUND","Evaluation does not belong to this period");
  return {period,input,requiredPeriod:required(period,input)};
}
const sourceInclude = { input: {include: { period: {include: {status:true}}, scorecard:true }} } as const;
function sourceWhere(period: any, input: any, required: RequiredPeriod): Prisma.KpiResultWhereInput {
  return { resultValue: {not:null,gte:0}, calculationStatus:"CALCULATED",
    input: { monitoringPeriodId:{not:period.id}, evaluationKindSnapshot:input.evaluationKindSnapshot,
      subjectExternalIdSnapshot:input.subjectExternalIdSnapshot, subjectTypeSnapshot:input.subjectTypeSnapshot,
      measurementUnitCodeSnapshot:input.measurementUnitCodeSnapshot, resultSemanticsSnapshot:input.resultSemanticsSnapshot,
      period: {periodStart:date(required.start),periodEnd:date(required.end),inputFrequencyCodeSnapshot:required.frequencyCode,
        status:{code:"CLOSED"}} }};
}
function eligible(source: any): boolean {
  return !!source && source.resultValue !== null && source.calculationStatus === "CALCULATED" && hasCurrentScoring(source.input.period);
}
function candidateDto(source: any, input: any) {
  const i=source.input, p=i.period;
  return {id:String(source.id),value:source.resultValue.toString(),unit:i.measurementUnitSymbolSnapshot,
    periodKey:p.periodKey,periodStart:p.periodStart.toISOString().slice(0,10),periodEnd:p.periodEnd.toISOString().slice(0,10),
    poolId:String(p.kpiPoolExternalId),poolName:p.poolNameSnapshot,scorecardId:String(i.scorecard.scorecardExternalId),
    scorecardName:i.scorecard.scorecardNameSnapshot,kpiCode:i.kpiCodeSnapshot,kpiName:i.kpiNameSnapshot,
    subjectExternalId:i.subjectExternalIdSnapshot,subjectLabel:i.subjectLabelSnapshot,
    rank:i.kpiConfigurationExternalId===input.kpiConfigurationExternalId?1:i.kpiDefinitionExternalId===input.kpiDefinitionExternalId?2:3,
    sourceMonitoringPeriodId:String(p.id),sourceKpiDefinitionId:String(i.kpiDefinitionExternalId),
    sourceKpiConfigurationId:String(i.kpiConfigurationExternalId),sourceRevisionId:String(i.kpiConfigurationRevisionExternalId),
    sourceResultVersion:source.version, sourceResultsVersion:p.resultsVersion, sourceBaselineVersion:p.baselineVersion, state:p.status.code };
}
async function sources(db: Tx, period: any, input: any, req: RequiredPeriod, filters: z.infer<typeof baselineQuery> = {page:1}, exact = false) {
  const where=sourceWhere(period,input,req);
  const inputWhere=where.input as Prisma.MonitoringPeriodInputWhereInput;
  if (exact) {
    inputWhere.kpiDefinitionExternalId=input.kpiDefinitionExternalId;
    inputWhere.evaluationTypeCodeSnapshot=input.evaluationTypeCodeSnapshot;
    inputWhere.scoringMethodCodeSnapshot=input.scoringMethodCodeSnapshot;
  }
  if (filters.pool) (inputWhere.period as Prisma.MonitoringPeriodWhereInput).kpiPoolExternalId=BigInt(filters.pool);
  if (filters.scorecard) inputWhere.scorecard={scorecardExternalId:BigInt(filters.scorecard)};
  if (filters.query) inputWhere.OR=[{kpiCodeSnapshot:{contains:filters.query}},{kpiNameSnapshot:{contains:filters.query}},
    {subjectLabelSnapshot:{contains:filters.query}},{period:{poolNameSnapshot:{contains:filters.query}}},{scorecard:{scorecardNameSnapshot:{contains:filters.query}}}];
  // Do not truncate automatic matching: truncation must never turn ambiguity into a unique match.
  const rows=(await db.kpiResult.findMany({where,include:sourceInclude,orderBy:{id:"asc"}})).filter(eligible);
  return rows.sort((a,b)=>candidateDto(a,input).rank-candidateDto(b,input).rank);
}
async function latest(db:Tx,inputId:bigint) {
  return db.historicalBaselineResolution.findFirst({where:{monitoringPeriodInputId:inputId},orderBy:{revisionNo:"desc"}});
}
async function record(db:Tx, period:any, input:any, req:RequiredPeriod, sourceType:string, actor:bigint,
  value:Prisma.Decimal, reason:string|null, source:any|null) {
  const previous=await latest(db,input.id);
  // Source origin and reason are meaningful context, even if the numeric value is unchanged.
  if(previous && previous.sourceType===sourceType && previous.sourceResultId===(source?.id??null)
    && previous.baselineValueSnapshot.eq(value) && previous.reason===reason
    && previous.requiredPeriodKey===req.key
    && ["id","code","name","symbol"].every(key=>(previous.baselineUnitSnapshot as any)?.[key]===evaluationUnits(input.effectiveSettingsSnapshot,input.subjectExternalIdSnapshot).resultUnit[key])) return previous;
  period.baselineVersion=(period.baselineVersion??0)+1;
  const i=source?.input;
  const row=await db.historicalBaselineResolution.create({data:{
    monitoringPeriodId:period.id,monitoringPeriodInputId:input.id,revisionNo:(previous?.revisionNo??0)+1,
    baselineVersion:period.baselineVersion,referenceType:input.effectiveSettingsSnapshot.periodScope,
    requiredPeriodKey:req.key,requiredPeriodStart:date(req.start),requiredPeriodEnd:date(req.end),
    subjectExternalId:input.subjectExternalIdSnapshot,sourceType,baselineValueSnapshot:value,
    baselineUnitSnapshot:asJson(evaluationUnits(input.effectiveSettingsSnapshot,input.subjectExternalIdSnapshot).resultUnit),sourceResultId:source?.id??null,
    sourceMonitoringPeriodId:i?.monitoringPeriodId??null,sourcePoolExternalId:i?.period.kpiPoolExternalId??null,
    sourceScorecardExternalId:i?.scorecard.scorecardExternalId??null,sourceKpiDefinitionExternalId:i?.kpiDefinitionExternalId??null,
    sourceKpiConfigurationExternalId:i?.kpiConfigurationExternalId??null,sourceSubjectExternalId:i?.subjectExternalIdSnapshot??null,
    provenance:asJson(source?candidateDto(source,input):{requiredPeriod:req,unit:evaluationUnits(input.effectiveSettingsSnapshot,input.subjectExternalIdSnapshot).resultUnit,description:reason}),
    reason,resolvedByUserId:actor }});
  await clearCurrentScoring(db,period.id);
  await db.monitoringPeriod.update({where:{id:period.id},data:{baselineVersion:period.baselineVersion,currentScoringResultsVersion:null,
    currentScoringBaselineVersion:null,validationStatus:period.validationRunAt?"STALE":null,validationSummary:Prisma.JsonNull}});
  return row;
}
export async function resolveEvaluationContexts(db:Tx,period:any,inputs:any[],actor:bigint) {
  const contexts=new Map<string,any>();
  for(const input of inputs) {
    if(!isHistorical(input.effectiveSettingsSnapshot)) continue;
    let context=baselineContext(period,input);
    if(context.errorCode){contexts.set(String(input.id),context);continue;}
    let resolution=await latest(db,input.id);
    if(!resolution) {
      const matches=await sources(db,period,input,context.requiredPeriod!,{page:1},true);
      const sameConfiguration=matches.filter(r=>r.input.kpiConfigurationExternalId===input.kpiConfigurationExternalId);
      const best=sameConfiguration.length?sameConfiguration:matches;
      if(best.length===1) resolution=await record(db,period,input,context.requiredPeriod!,"AUTO_MATCH",actor,best[0]!.resultValue!,null,best[0]);
      else context={...context,errorCode:best.length?"HISTORICAL_BASELINE_AMBIGUOUS":"HISTORICAL_BASELINE_MISSING"};
    }
    if(resolution) {
      context=baselineContext(period,input,resolution);
      if(resolution.sourceResultId) {
        const source=await db.kpiResult.findFirst({where:{...sourceWhere(period,input,context.requiredPeriod!),id:resolution.sourceResultId},include:sourceInclude});
        if(!eligible(source)||!source!.resultValue!.eq(resolution.baselineValueSnapshot)) context={...context,state:"INVALID",errorCode:"HISTORICAL_BASELINE_SOURCE_NOT_ELIGIBLE"};
      }
    }
    contexts.set(String(input.id),context);
  }
  return contexts;
}
export const historicalBaselineService = {
  async candidates(periodId:string,inputId:string,query:z.infer<typeof baselineQuery>) {
    return prisma.$transaction(async db=>{
      const {period,input,requiredPeriod}=await target(db,BigInt(periodId),BigInt(inputId));
      const all=await sources(db,period,input,requiredPeriod,query);
      const current=await latest(db,input.id);
      return {baselineVersion:period.baselineVersion,requiredPeriod,unit:evaluationUnits(input.effectiveSettingsSnapshot,input.subjectExternalIdSnapshot).resultUnit,
        resolution:current?resolutionDto(current):null,page:query.page,total:all.length,
        candidates:all.slice((query.page-1)*25,query.page*25).map(r=>candidateDto(r,input))};
    });
  },
  async history(periodId:string,inputId:string) {
    await target(prisma,BigInt(periodId),BigInt(inputId));
    return {revisions:(await prisma.historicalBaselineResolution.findMany({where:{monitoringPeriodId:BigInt(periodId),monitoringPeriodInputId:BigInt(inputId)},orderBy:{revisionNo:"desc"}})).map(resolutionDto)};
  },
  async save(periodId:string,inputId:string,body:z.infer<typeof selectedBaselineBody>|z.infer<typeof manualBaselineBody>,actor:bigint) {
    body = "sourceResultId" in body ? selectedBaselineBody.parse(body) : manualBaselineBody.parse(body);
    try {
      return await prisma.$transaction(async db=>{
        const {period,input,requiredPeriod}=await target(db,BigInt(periodId),BigInt(inputId));
        if(period.status.code!=="DRAFT") throw new AppError(409,"MONITORING_PERIOD_NOT_DRAFT","Baseline resolution requires an editable DRAFT period");
        if(period.baselineVersion!==body.expectedBaselineVersion) throw new AppError(409,"BASELINE_VERSION_CONFLICT","Baseline changed. Reload baseline context and retry.");
        const claim=await db.monitoringPeriod.updateMany({where:{id:period.id,version:period.version,baselineVersion:body.expectedBaselineVersion},data:{version:{increment:1}}});
        if(claim.count!==1) throw new AppError(409,"BASELINE_VERSION_CONFLICT","The period changed. Reload and retry.");
        let source=null;
        if("sourceResultId" in body) {
          source=await db.kpiResult.findFirst({where:{...sourceWhere(period,input,requiredPeriod),id:BigInt(body.sourceResultId)},include:sourceInclude});
          if(!eligible(source)) throw new AppError(422,"HISTORICAL_BASELINE_INCOMPATIBLE","Selected source must be a calculated CLOSED Result with the required period, unit and subject.");
        }
        const resolution=await record(db,period,input,requiredPeriod,source?"USER_MATCH":"MANUAL",actor,
          source?source.resultValue!:new Prisma.Decimal((body as z.infer<typeof manualBaselineBody>).value),
          "reason" in body?body.reason:null,source);
        return {baselineVersion:period.baselineVersion,resolution:resolutionDto(resolution)};
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error) {
      if(error instanceof Prisma.PrismaClientKnownRequestError && ["P2002","P2034"].includes(error.code)) throw new AppError(409,"BASELINE_VERSION_CONFLICT","Concurrent baseline or Results change. Reload and retry.");
      throw error;
    }
  },
};

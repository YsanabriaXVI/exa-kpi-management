import { afterAll,beforeAll,describe,it,expect,vi } from "vitest";
const pool=vi.hoisted(()=>({context:vi.fn()}));
const scorecards=vi.hoisted(()=>({materialization:vi.fn()}));
vi.mock("../clients/kpi-pool.client.js",()=>({kpiPoolClient:pool}));
vi.mock("../clients/scorecards.client.js",()=>({scorecardsClient:scorecards}));
import { prisma } from "../config/prisma.js";
import { monitoringPeriodService } from "../services/monitoring-period.service.js";
import { resultEntryService } from "../services/result-entry.service.js";
import { checkResultsService } from "../services/check-results.service.js";
import { historicalBaselineService } from "../services/historical-baseline.service.js";
import { frozen } from "./fixtures/check-results.js";
const run=process.env.RUN_MONITORING_INTEGRATION==="true"?describe:describe.skip;
const poolIds:bigint[]=[];let seq=993500;let current:string,source:string,second:string,currentInput:string,sourceResult:string;
const f=(historical:boolean,definition="7",reference="PREVIOUS_PERIOD"):any=>({...structuredClone(frozen),kpiDefinitionId:definition,
  evaluationScope:"OVERALL",subjectType:null,subjectGoals:[],groupGoal:null,goal:historical?"10":"100000",
  ...(historical?{periodScope:reference,comparisonMode:reference,comparisonDirection:"INCREASE",targetKind:"CHANGE_TARGET",
    historicalCapabilityVersion:"HISTORICAL_COMPARISON_V1",inputFrequency:{id:"1",code:"MONTHLY",monthsPerPeriod:1},
    goalUnit:{id:"2",code:"PERCENT",name:"Percent",symbol:"%"}}:{})});
async function make(key:string,settings:any,value:string,closed=false) {
  const external=BigInt(++seq);poolIds.push(external);
  const start=key+"-01",end=new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5)),0)).toISOString().slice(0,10);
  pool.context.mockResolvedValue({pool:{id:String(external),poolCode:"HIST-"+external,poolName:"History "+external,status:"ACTIVE",inputFrequency:{id:"1",code:"MONTHLY"},companies:[]},
    period:{poolPeriodId:String(external),poolCompositionId:String(external),periodKey:key,start,end,workflowStatus:"FINALIZED"}});
  scorecards.materialization.mockResolvedValue({poolId:String(external),poolInputPeriodId:String(external),poolCompositionId:String(external),periodKey:key,readiness:"READY",
    applicableScorecardCount:1,finalizedScorecardCount:1,scorecards:[{scorecardId:String(external),scorecardCode:"SC-H",scorecardName:"Historical Sales",scorecardPeriodCompositionId:String(external),departments:[],linkedScorecards:[],
      directKpiAssignments:[{scorecardKpiAssignmentId:String(external),kpiConfigurationId:settings.kpiConfigurationId,kpiConfigurationRevisionId:settings.kpiConfigurationRevisionId,poolMembershipExternalId:String(external),weightPercent:"100",effectiveSettings:settings,displayOrder:1}]}]});
  const made=await monitoringPeriodService.materialize({poolId:String(external),poolInputPeriodId:String(external)},11n);
  const id=made.data.id;
  let entry=await resultEntryService.save(id,{resultsVersion:0,changes:[]},11n);
  entry=await resultEntryService.save(id,{resultsVersion:entry.monitoringPeriod.resultsVersion,changes:entry.inputs.map((i:any)=>({monitoringPeriodInputId:i.id,resultValue:value,version:null}))},11n);
  if(closed) {
    await checkResultsService.check(id,{expectedResultsVersion:entry.monitoringPeriod.resultsVersion},11n);
    const status=await prisma.monitoringPeriodStatus.findUniqueOrThrow({where:{code:"CLOSED"}});
    await prisma.monitoringPeriod.update({where:{id:BigInt(id)},data:{statusId:status.id,closedAt:new Date()}});
  }
  return id;
}
const get=(id=current)=>resultEntryService.get(id);
const check=async(id=current)=>{const p=await get(id);return checkResultsService.check(id,{expectedResultsVersion:p.monitoringPeriod.resultsVersion,expectedBaselineVersion:p.monitoringPeriod.baselineVersion},11n);};
async function resultId(id:string) {const p=await get(id);return String((await prisma.kpiResult.findUniqueOrThrow({where:{monitoringPeriodInputId:BigInt(p.inputs[0].id)}})).id);}
async function cleanup() {
  for(const p of await prisma.monitoringPeriod.findMany({where:{kpiPoolExternalId:{in:poolIds}},select:{id:true}})) {
    const scope={input:{monitoringPeriodId:p.id}};
    await prisma.historicalBaselineResolution.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.monitoringValidationIssue.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.monitoringValidationRun.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.kpiResultRevision.deleteMany({where:{result:scope}});
    await prisma.kpiResult.deleteMany({where:scope});
    await prisma.resultEntryBatchRow.deleteMany({where:scope});
    await prisma.resultEntryBatch.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.monitoringPeriodInput.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.monitoringPeriodScorecard.deleteMany({where:{monitoringPeriodId:p.id}});
    await prisma.monitoringPeriod.delete({where:{id:p.id}});
  }
}
run("Historical baseline MySQL acceptance",()=>{
  beforeAll(async()=>{source=await make("2096-07",f(false),"100000",true);sourceResult=await resultId(source);current=await make("2096-08",f(true),"115000");currentInput=(await get()).inputs[0].id;});
  afterAll(async()=>{await cleanup();await prisma.$disconnect();});
  it("materializes historical metadata, permits current entry and auto-matches a CLOSED source with audited provenance",async()=>{
    const before=await get();expect(before.inputs[0].entryBlock).toBeNull();
    const checked=await check();
    expect(checked.check).toMatchObject({status:"CURRENT",basedOnBaselineVersion:1});
    expect(checked.monitoringPeriod.resultsVersion).toBe(before.monitoringPeriod.resultsVersion);
    expect(checked.check.evaluations[0]).toMatchObject({rawAchievementPercent:"150.000000",compliancePercent:"100.000000",goalMet:true,
      historical:{signedChangePercent:"15",resolution:{sourceType:"AUTO_MATCH",sourceResultId:sourceResult}}});
    const row=await prisma.historicalBaselineResolution.findFirstOrThrow({where:{monitoringPeriodId:BigInt(current)}});
    expect(row.sourceMonitoringPeriodId).toBe(BigInt(source));expect(row.resolvedByUserId).toBe(11n);
  });
  it("does not arbitrarily choose among multiple exact sources",async()=>{
    second=await make("2096-07",f(false),"102500",true);
    const ambiguous=await make("2096-08",f(true),"115000");
    const checked=await check(ambiguous);
    expect(checked.check.evaluations[0].errorCode).toBe("HISTORICAL_BASELINE_AMBIGUOUS");
    expect(await prisma.historicalBaselineResolution.count({where:{monitoringPeriodId:BigInt(ambiguous)}})).toBe(0);
  });
  it("searches other Pools and records USER_MATCH; invalidates only baseline context",async()=>{
    const before=await get(),oldRun=await prisma.monitoringValidationRun.findUniqueOrThrow({where:{id:BigInt(before.check.runId)}});
    const candidates=await historicalBaselineService.candidates(current,currentInput,{page:1,query:"History"});
    expect(candidates.total).toBeGreaterThanOrEqual(2);
    await historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:1,sourceResultId:await resultId(second)},12n);
    const changed=await get();expect(changed.monitoringPeriod).toMatchObject({resultsVersion:before.monitoringPeriod.resultsVersion,baselineVersion:2});
    expect(changed.check.status).toBe("STALE");expect(changed.inputs[0].scoring).toBeNull();
    expect(await prisma.monitoringValidationRun.findUniqueOrThrow({where:{id:oldRun.id}})).toEqual(oldRun);
    expect((await check()).check).toMatchObject({status:"CURRENT",basedOnBaselineVersion:2});
  });
  it("keeps no-op USER_MATCH current without a fake revision",async()=>{
    const before=await get(),count=await prisma.historicalBaselineResolution.count({where:{monitoringPeriodId:BigInt(current)}});
    await historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:2,sourceResultId:await resultId(second)},12n);
    expect((await get()).check.status).toBe("CURRENT");
    expect((await get()).monitoringPeriod.baselineVersion).toBe(before.monitoringPeriod.baselineVersion);
    expect(await prisma.historicalBaselineResolution.count({where:{monitoringPeriodId:BigInt(current)}})).toBe(count);
  });
  it("supports manual provenance and semantic numeric no-op with exact required period and unit",async()=>{
    const before=await get();
    await historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:before.monitoringPeriod.baselineVersion,value:"101000",reason:"ERP July source before EXA"},13n);
    const changed=await check();
    const history=await historicalBaselineService.history(current,currentInput);
    expect(history.revisions[0]).toMatchObject({sourceType:"MANUAL",requiredPeriod:{key:"2096-07"},unit:{symbol:"USD"},reason:"ERP July source before EXA",resolvedBy:"13"});
    await historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:changed.monitoringPeriod.baselineVersion,value:"101000.000000",reason:"ERP July source before EXA"},13n);
    expect((await get()).check.status).toBe("CURRENT");
    expect((await historicalBaselineService.history(current,currentInput)).revisions.length).toBe(history.revisions.length);
  });
  it("rejects obsolete baseline version, wrong period and non-CLOSED sources without changing context",async()=>{
    const before=await get();
    await expect(historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:0,sourceResultId:sourceResult},11n)).rejects.toMatchObject({code:"BASELINE_VERSION_CONFLICT"});
    const draft=await make("2096-07",f(false),"100000");
    await expect(historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:before.monitoringPeriod.baselineVersion,sourceResultId:await resultId(draft)},11n)).rejects.toMatchObject({code:"HISTORICAL_BASELINE_INCOMPATIBLE"});
    const wrong=await make("2096-06",f(false),"100000",true);
    await expect(historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:before.monitoringPeriod.baselineVersion,sourceResultId:await resultId(wrong)},11n)).rejects.toMatchObject({code:"HISTORICAL_BASELINE_INCOMPATIBLE"});
    expect((await get()).monitoringPeriod.baselineVersion).toBe(before.monitoringPeriod.baselineVersion);
  });
  it("resolves previous-year exactly and reports missing then zero baseline without Infinity",async()=>{
    const prior=await make("2095-08",f(false,"88"),"100000",true);
    const yearly=await make("2096-08",f(true,"88","SAME_PERIOD_PREVIOUS_YEAR"),"115000");
    expect((await check(yearly)).check.evaluations[0].historical.resolution.sourceResultId).toBe(await resultId(prior));
    const missing=await make("2096-08",f(true,"999"),"100");
    expect((await check(missing)).check.evaluations[0].errorCode).toBe("HISTORICAL_BASELINE_MISSING");
    const p=await get(missing);
    await historicalBaselineService.save(missing,p.inputs[0].id,{expectedBaselineVersion:0,value:"0",reason:"Confirmed zero in the prior ERP"},11n);
    expect((await check(missing)).check.evaluations[0]).toMatchObject({status:"NOT_CALCULABLE",errorCode:"HISTORICAL_BASELINE_ZERO_UNDEFINED",rawAchievementPercent:null});
  });
  it("serializes competing baseline writes and preserves current Result",async()=>{
    const before=await get();
    const writes=await Promise.allSettled(["103000","104000"].map(value=>historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:before.monitoringPeriod.baselineVersion,value,reason:"Audited corrected ERP source"},11n)));
    expect(writes.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((writes.find(r=>r.status==="rejected") as PromiseRejectedResult).reason.code).toBe("BASELINE_VERSION_CONFLICT");
    expect((await get()).inputs[0].resultValue).toBe("115000");
    expect((await get()).monitoringPeriod.resultsVersion).toBe(before.monitoringPeriod.resultsVersion);
  });
  it("matches BY_ENTITY by stable ID despite changed labels, leaving only the missing entity unresolved",async()=>{
    const sourceSettings={...structuredClone(frozen),subjectGoals:frozen.subjectGoals.slice(0,3).map(s=>({...s,subjectLabel:"Historical "+s.subjectExternalId}))};
    await make("2096-09",sourceSettings,"100000",true);
    const targetSettings={...f(true),evaluationScope:"BY_SUBJECT",subjectType:"EMPLOYEE",
      subjectGoals:frozen.subjectGoals.map(s=>({...s,goal:"10"})),groupGoal:{value:"10",unit:"%",label:"Group"}};
    const entities=await make("2096-10",targetSettings,"115000");
    const checked=await check(entities);
    expect(checked.check.evaluations.map((e:any)=>e.status)).toEqual(["CALCULATED","CALCULATED","CALCULATED","NOT_CALCULABLE"]);
    expect(checked.check.evaluations[3].errorCode).toBe("HISTORICAL_BASELINE_MISSING");
    expect(checked.check.scorecards[0]).toMatchObject({scoreStatus:"PARTIAL",score:"25.000000"});
    const candidate=await prisma.kpiResult.findFirstOrThrow({where:{input:{subjectExternalIdSnapshot:"2",period:{periodKey:"2096-09"}}}});
    await expect(historicalBaselineService.save(entities,checked.inputs[0].id,{expectedBaselineVersion:checked.monitoringPeriod.baselineVersion,sourceResultId:String(candidate.id)},11n)).rejects.toMatchObject({code:"HISTORICAL_BASELINE_INCOMPATIBLE"});
  });
  it("keeps Check publication coherent when baseline resolution races Check",async()=>{
    const before=await get();
    const results=await Promise.allSettled([
      checkResultsService.check(current,{expectedResultsVersion:before.monitoringPeriod.resultsVersion,expectedBaselineVersion:before.monitoringPeriod.baselineVersion},11n),
      historicalBaselineService.save(current,currentInput,{expectedBaselineVersion:before.monitoringPeriod.baselineVersion,value:"105000",reason:"Audited source during concurrent check"},11n)]);
    expect(results.some(r=>r.status==="fulfilled")).toBe(true);
    for(const r of results)if(r.status==="rejected")expect(["RESULT_VERSION_CONFLICT","BASELINE_VERSION_CONFLICT"]).toContain(r.reason.code);
    const after=await get();
    if(after.check.status==="CURRENT") {
      expect(after.check.basedOnBaselineVersion).toBe(after.monitoringPeriod.baselineVersion);
      expect(after.check.basedOnResultsVersion).toBe(after.monitoringPeriod.resultsVersion);
    } else expect(after.inputs[0].scoring).toBeNull();
  });
  it("never modifies the authoritative source Result",async()=>{
    const row=await prisma.kpiResult.findUniqueOrThrow({where:{id:BigInt(sourceResult)}});
    expect(row.resultValue?.toString()).toBe("100000");
    expect(row.version).toBe(1);
    expect((await get(source)).monitoringPeriod.status).toBe("CLOSED");
  });
});

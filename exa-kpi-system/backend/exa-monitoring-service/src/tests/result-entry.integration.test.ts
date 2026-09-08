import {checkResultsService} from "../services/check-results.service.js";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {prisma} from "../config/prisma.js";
import {monitoringWorkflowService} from "../services/monitoring-workflow.service.js";
import {monitoringReadService} from "../services/monitoring-read.service.js";
import {detailInputsQuerySchema, attachedScorecardsQuerySchema} from "../schemas/monitoring-period.schema.js";
import {resultEntryService} from "../services/result-entry.service.js";
const run=process.env.RUN_MONITORING_INTEGRATION==="true"?describe:describe.skip;
const externalId=990001n;
let entityPeriod="",overallPeriod="";
async function cleanup(){
 const periods=await prisma.monitoringPeriod.findMany({where:{kpiPoolExternalId:externalId},select:{id:true}});
 for(const period of periods){
  const inputs=await prisma.monitoringPeriodInput.findMany({where:{monitoringPeriodId:period.id},select:{id:true}});
  const ids=inputs.map(i=>i.id);
  await prisma.monitoringValidationIssue.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.monitoringValidationRun.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.monitoringPeriodWorkflowEvent.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.kpiResultRevision.deleteMany({where:{result:{monitoringPeriodInputId:{in:ids}}}});
  await prisma.kpiResult.deleteMany({where:{monitoringPeriodInputId:{in:ids}}});
  await prisma.resultEntryBatchRow.deleteMany({where:{monitoringPeriodInputId:{in:ids}}});
  await prisma.resultEntryBatch.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.monitoringPeriodInput.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.monitoringPeriodScorecard.deleteMany({where:{monitoringPeriodId:period.id}});
  await prisma.monitoringPeriod.delete({where:{id:period.id}});
 }
}
async function setup(entity:boolean){
 const draft=await prisma.monitoringPeriodStatus.findUniqueOrThrow({where:{code:"DRAFT"}});
 const month=entity?"01":"02";
 const period=await prisma.monitoringPeriod.create({data:{kpiPoolExternalId:externalId,poolInputPeriodExternalId:externalId+(entity?0n:1n),poolPeriodCompositionExternalId:externalId,poolCodeSnapshot:"MANUAL-TEST",poolNameSnapshot:"Manual Test",sequenceNo:entity?1:2,periodKey:`2099-${month}`,periodStart:new Date(`2099-${month}-01`),periodEnd:new Date(`2099-${month}-28`),periodLabel:`Test ${month}`,statusId:draft.id}});
 const card=await prisma.monitoringPeriodScorecard.create({data:{monitoringPeriodId:period.id,scorecardExternalId:externalId,scorecardPeriodCompositionExternalId:externalId,scorecardCodeSnapshot:"SC-TEST",scorecardNameSnapshot:"Test Scorecard"}});
 for(let i=0;i<(entity?4:1);i++) await prisma.monitoringPeriodInput.create({data:{monitoringPeriodId:period.id,monitoringPeriodScorecardId:card.id,kpiConfigurationExternalId:externalId,kpiConfigurationRevisionExternalId:externalId,poolCompositionItemExternalId:externalId,scorecardKpiAssignmentExternalId:externalId,configCodeSnapshot:"KPC-T",kpiCodeSnapshot:"KPI-T",kpiNameSnapshot:entity?"Sales by entity":"Zero incidents",evaluationKindSnapshot:entity?"ENTITY":"OVERALL",subjectExternalIdSnapshot:entity?String(i):null,subjectLabelSnapshot:entity?["Jacky","Nancy","Carlos","Ana"][i]:null,goalTextSnapshot:entity?["80000","60000","50000","50000"][i]:"0",evaluationTypeCodeSnapshot:"GREATER_IS_BETTER",measurementUnitSymbolSnapshot:entity?"USD":"incidents",weightPercentSnapshot:entity?[10,8,7,5][i]!:15,displayOrder:i+1,effectiveSettingsSnapshot:{periodScope:"CURRENT_PERIOD",executability:{executable:true},goalUnit:{symbol:entity?"USD":"incidents"},groupGoal:entity?{value:"250000",unit:"USD",label:"Group Goal"}:null}}});
 return period.id.toString();
}
async function save(periodId:string,values:Array<[number,string|null]>){const current=await resultEntryService.get(periodId);return resultEntryService.save(periodId,{resultsVersion:current.monitoringPeriod.resultsVersion,changes:values.map(([index,resultValue])=>({monitoringPeriodInputId:current.inputs[index].id,resultValue,version:current.inputs[index].version}))},11n);}
run("Manual Result Entry MySQL",()=>{
 beforeAll(async()=>{await cleanup();for(const [model,code] of [[prisma.monitoringInputMethod,"MANUAL"],[prisma.resultEntryBatchStatus,"IMPORTED"],[prisma.resultEntryRowStatus,"VALID"],[prisma.kpiResultStatus,"PENDING"],[prisma.kpiResultStatus,"ENTERED"]] as const) await (model as any).upsert({where:{code},update:{},create:{code,name:code}});entityPeriod=await setup(true);overallPeriod=await setup(false);});
 afterAll(async()=>{await cleanup();await prisma.$disconnect();});
 it("persists partial entity Results, reloads, completes and preserves frozen weights",async()=>{
  const partial=await save(entityPeriod,[[0,"83500"],[1,"58200"],[2,"52000"]]);
  expect(partial.summary).toEqual({expected:4,entered:3,pending:1,completionPercent:75});
  const loaded=await resultEntryService.get(entityPeriod);expect(loaded.inputs.map((i:any)=>i.resultValue)).toEqual(["83500","58200","52000",null]);
  const complete=await save(entityPeriod,[[3,"49500"]]);expect(complete.summary.completionPercent).toBe(100);
  expect(complete.inputs.map((i:any)=>i.weight)).toEqual(["10","8","7","5"]);
  expect(complete.inputs.map((i:any)=>i.subject.label)).toEqual(["Jacky","Nancy","Carlos","Ana"]);
  expect(complete.inputs.map((i:any)=>i.goal)).toEqual(["80000","60000","50000","50000"]);
  expect(complete.inputs[0].groupGoal).toMatchObject({value:"250000"});expect(complete.inputs).toHaveLength(4);
  expect(complete.inputs.every((i:any)=>i.scoring===null)).toBe(true);
 });
 it("supports OVERALL zero, exact decimals, no-op, edit and clear with audited revisions",async()=>{
  const zero=await save(overallPeriod,[[0,"0"]]);expect(zero.summary.completionPercent).toBe(100);expect(zero.inputs[0].resultValue).toBe("0");
  const before=await prisma.kpiResultRevision.count({where:{result:{monitoringPeriodInputId:BigInt(zero.inputs[0].id)}}});
  const same=await save(overallPeriod,[[0,"0.000000"]]);expect(same.monitoringPeriod.resultsVersion).toBe(zero.monitoringPeriod.resultsVersion);
  expect(await prisma.kpiResultRevision.count({where:{result:{monitoringPeriodInputId:BigInt(zero.inputs[0].id)}}})).toBe(before);
  const exact=await save(overallPeriod,[[0,"12345678901234.123456"]]);expect(exact.inputs[0].resultValue).toBe("12345678901234.123456");
  const cleared=await save(overallPeriod,[[0,null]]);expect(cleared.summary).toEqual({expected:1,entered:0,pending:1,completionPercent:0});
  expect(cleared.monitoringPeriod.resultsVersion).toBe(3);
  const revisions=await prisma.kpiResultRevision.findMany({where:{result:{monitoringPeriodInputId:BigInt(zero.inputs[0].id)}},orderBy:{revisionNo:"asc"}});
  expect(revisions.map(r=>[r.previousResultValue?.toString()??null,r.newResultValue?.toString()??null,r.entrySource,r.changedByUserId])).toEqual([[null,"0","MANUAL",11n],["0","12345678901234.123456","MANUAL",11n],["12345678901234.123456",null,"MANUAL",11n]]);
 });
 it("rejects a stale aggregate and cross-period IDs without writing",async()=>{
  const entity=await resultEntryService.get(entityPeriod),overall=await resultEntryService.get(overallPeriod);
  await expect(resultEntryService.save(entityPeriod,{resultsVersion:0,changes:[]},11n)).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
  await expect(resultEntryService.save(entityPeriod,{resultsVersion:entity.monitoringPeriod.resultsVersion,changes:[{monitoringPeriodInputId:overall.inputs[0].id,resultValue:"1",version:overall.inputs[0].version}]},11n)).rejects.toMatchObject({code:"MONITORING_INPUT_NOT_IN_PERIOD"});
 });
 it("serializes competing saves so exactly one wins",async()=>{
  const original=await resultEntryService.get(entityPeriod);
  const results=await Promise.allSettled(["84000","85000"].map(resultValue=>resultEntryService.save(entityPeriod,{resultsVersion:original.monitoringPeriod.resultsVersion,changes:[{monitoringPeriodInputId:original.inputs[0].id,resultValue,version:original.inputs[0].version}]},11n)));
  expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
  expect((results.find(result=>result.status==="rejected") as PromiseRejectedResult).reason.code).toBe("RESULT_VERSION_CONFLICT");
 });

 it("binds immutable Checks to Results versions and clears every current scoring consumer",async()=>{
  let current=await save(overallPeriod,[[0,"10"]]);
  await prisma.monitoringPeriodInput.update({where:{id:BigInt(current.inputs[0].id)},data:{goalValueSnapshot:10,scoringMethodCodeSnapshot:"PROPORTIONAL",scoringApprovalStatusSnapshot:"APPROVED",negativeResultPolicySnapshot:"DISALLOW",scoringRuleConfigSnapshot:{floorPercent:0,capPercent:100}}});
  const checked=await checkResultsService.check(overallPeriod,{expectedResultsVersion:current.monitoringPeriod.resultsVersion},11n);
  expect(checked.monitoringPeriod.validationRun).toMatchObject({basedOnResultsVersion:current.monitoringPeriod.resultsVersion,status:"CURRENT"});
  expect(checked.monitoringPeriod.resultsVersion).toBe(current.monitoringPeriod.resultsVersion);
  const runId=BigInt(checked.monitoringPeriod.validationRun!.id);
  const original=await prisma.monitoringValidationRun.findUniqueOrThrow({where:{id:runId}});
  expect(original.legacyWorkflowVersion).toBeNull();
  expect(original.scoringSnapshot).not.toBeNull();
  const unchanged=await save(overallPeriod,[[0,"10.000000"]]);
  expect(unchanged.monitoringPeriod.validationRun!.status).toBe("CURRENT");
  // Seed visibly non-null materialized fields to verify all consumer boundaries.
  await prisma.kpiResult.update({where:{monitoringPeriodInputId:BigInt(current.inputs[0].id)},data:{compliancePercent:100,weightedScorePoints:15,trafficLightCode:"GREEN"}});
  await prisma.monitoringPeriodScorecard.updateMany({where:{monitoringPeriodId:BigInt(overallPeriod)},data:{previewScorePercent:100}});
  const changed=await save(overallPeriod,[[0,"20"]]);
  expect(changed.monitoringPeriod.resultsVersion).toBe(current.monitoringPeriod.resultsVersion+1);
  expect(changed.monitoringPeriod.validationRun).toMatchObject({basedOnResultsVersion:original.basedOnResultsVersion,status:"STALE"});
  expect(changed.inputs[0].scoring).toBeNull();
  expect(changed.scorecards[0].previewScorePercent).toBeNull();
  expect(await prisma.monitoringValidationRun.findUniqueOrThrow({where:{id:runId}})).toEqual(original);
  const persisted=await prisma.kpiResult.findUniqueOrThrow({where:{monitoringPeriodInputId:BigInt(current.inputs[0].id)}});
  expect(persisted).toMatchObject({compliancePercent:null,weightedScorePoints:null,trafficLightCode:null,calculationStatus:null});
  const detail=await monitoringReadService.detail(overallPeriod,detailInputsQuerySchema.parse({}));
  expect(detail.data[0]).toMatchObject({score:null,weightedScore:null,trafficLight:null,validation:"NOT_CHECKED"});
  const attached=await monitoringReadService.attached(overallPeriod,attachedScorecardsQuerySchema.parse({}));
  expect(attached.data[0]).toMatchObject({previewScore:null,trafficLights:{green:0,yellow:0,red:0}});
  await expect(monitoringWorkflowService.submit(overallPeriod,{version:changed.monitoringPeriod.version},11n)).rejects.toMatchObject({code:"VALIDATION_REQUIRED"});
  const rechecked=await checkResultsService.check(overallPeriod,{expectedResultsVersion:changed.monitoringPeriod.resultsVersion},11n);
  expect(rechecked.monitoringPeriod.validationRun).toMatchObject({basedOnResultsVersion:changed.monitoringPeriod.resultsVersion,status:"CURRENT"});
  expect(await prisma.monitoringValidationRun.findUniqueOrThrow({where:{id:runId}})).toEqual(original);
 });
 it("persists ordered operands, derives the official result and versions equal quotients",async()=>{
  let current=await resultEntryService.get(overallPeriod);
  const input=current.inputs[0];
  const stored=await prisma.monitoringPeriodInput.findUniqueOrThrow({where:{id:BigInt(input.id)}});
  const snapshot=stored.effectiveSettingsSnapshot as any;
  await prisma.monitoringPeriodInput.update({where:{id:stored.id},data:{effectiveSettingsSnapshot:{...snapshot,resultMethod:"CALCULATED_FROM_INPUTS",calculationTemplate:"DIVIDE",measurementInputs:[{name:"Cost",unit:"USD"},{name:"Containers",unit:"unit"}]}}});
  const write=async(numerator:string|null,denominator:string|null)=>{
    const latest=await resultEntryService.get(overallPeriod);
    return resultEntryService.save(overallPeriod,{resultsVersion:latest.monitoringPeriod.resultsVersion,changes:[{monitoringPeriodInputId:input.id,resultValue:"999",inputValues:{numerator,denominator},version:latest.inputs[0].version}]},11n);
  };
  current=await write("50000","2000");
  expect(current.inputs[0]).toMatchObject({resultValue:"25",inputValues:{numerator:"50000",denominator:"2000"}});
  expect((await resultEntryService.get(overallPeriod)).inputs[0].inputValues).toEqual({numerator:"50000",denominator:"2000"});
  const version=current.monitoringPeriod.resultsVersion;
  expect((await write("50000","2000")).monitoringPeriod.resultsVersion).toBe(version);
  current=await write("100000","4000");
  expect(current.inputs[0].resultValue).toBe("25");
  expect(current.monitoringPeriod.resultsVersion).toBe(version+1);
  current=await write("50000","0");
  expect(current.inputs[0]).toMatchObject({resultValue:null,resultCalculation:{errorCode:"RESULT_DENOMINATOR_ZERO"}});
  current=await write(null,"2000");
  expect(current.inputs[0]).toMatchObject({resultValue:null,inputValues:{numerator:null,denominator:"2000"},resultCalculation:{errorCode:"RESULT_INPUT_MISSING"}});
  const batches=await prisma.resultEntryBatchRow.findMany({where:{monitoringPeriodInputId:stored.id},orderBy:{id:"desc"},take:4});
  expect(batches.map(row=>row.inputValues)).toEqual([{numerator:null,denominator:"2000"},{numerator:"50000",denominator:"0"},{numerator:"100000",denominator:"4000"},{numerator:"50000",denominator:"2000"}]);
 });
});

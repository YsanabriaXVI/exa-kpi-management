import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const db = vi.hoisted(() => ({ monitoringPeriod: {findUnique:vi.fn(),updateMany:vi.fn(),update:vi.fn()}, monitoringPeriodInput:{findMany:vi.fn()},resultEntryBatch:{findFirst:vi.fn(),aggregate:vi.fn(),create:vi.fn(),update:vi.fn()},monitoringInputMethod:{findUnique:vi.fn()},resultEntryBatchStatus:{findUnique:vi.fn()},resultEntryRowStatus:{findUnique:vi.fn()},kpiResultStatus:{findUnique:vi.fn()},resultEntryBatchRow:{create:vi.fn()},kpiResult:{create:vi.fn(),updateMany:vi.fn()},kpiResultRevision:{create:vi.fn()},monitoringPeriodScorecard:{updateMany:vi.fn()},monitoringValidationRun:{updateMany:vi.fn()},$transaction:vi.fn() }));
vi.mock("../config/prisma.js",()=>({prisma:db}));
const recalculate = vi.hoisted(()=>vi.fn());
vi.mock("../services/scoring.service.js",()=>({recalculatePeriodScores:recalculate}));
import {resultEntryService} from "../services/result-entry.service.js";
let period:any;
let inputs:any[];
beforeEach(()=>{
 vi.clearAllMocks();
 inputs=[1,2,3,4].map((id,index)=>({id:BigInt(id),monitoringPeriodId:1n,kpiConfigurationExternalId:5n,kpiCodeSnapshot:"KPI-5",configCodeSnapshot:"KPC-5",kpiNameSnapshot:"Sales",evaluationKindSnapshot:"ENTITY",subjectExternalIdSnapshot:String(id),subjectLabelSnapshot:["Jacky","Nancy","Carlos","Ana"][index],goalTextSnapshot:"80000",measurementUnitSymbolSnapshot:"USD",weightPercentSnapshot:new Prisma.Decimal([10,8,7,5][index]!),effectiveSettingsSnapshot:{periodScope:"CURRENT_PERIOD",executability:{executable:true},goalUnit:{symbol:"USD"},groupGoal:{value:"250000",unit:"USD",label:"Group Goal"}},scorecard:{scorecardExternalId:9n,scorecardCodeSnapshot:"SC-9",scorecardNameSnapshot:"Sales"},result:null}));
 period={id:1n,statusId:1n,status:{code:"DRAFT"},version:1,resultsVersion:0,selectedEntryMethod:null,kpiPoolExternalId:2n,poolInputPeriodExternalId:3n,periodStart:new Date(),periodEnd:new Date(),scorecards:[],inputs};
 db.$transaction.mockImplementation(async(cb:any)=>cb(db));
 db.monitoringPeriod.findUnique.mockImplementation(async()=>period);
 db.monitoringPeriodInput.findMany.mockImplementation(async({where}:any)=>inputs.filter(input=>where.id.in.includes(input.id)));
 db.resultEntryBatch.findFirst.mockResolvedValue(null);
 db.monitoringPeriod.updateMany.mockImplementation(async({data}:any)=>{period.selectedEntryMethod=data.selectedEntryMethod;period.version++;period.resultsVersion+=data.resultsVersion.increment;return{count:1};});
 for(const catalog of [db.monitoringInputMethod,db.resultEntryBatchStatus,db.resultEntryRowStatus,db.kpiResultStatus])catalog.findUnique.mockResolvedValue({id:1n});
 db.resultEntryBatch.aggregate.mockResolvedValue({_max:{batchNo:0}});db.resultEntryBatch.create.mockResolvedValue({id:1n});db.resultEntryBatchRow.create.mockResolvedValue({id:1n});
 db.monitoringValidationRun.updateMany.mockResolvedValue({count:0});
 db.kpiResult.create.mockImplementation(async({data}:any)=>{const result={...data,inputValues:data.inputValues === Prisma.JsonNull ? null : data.inputValues,id:data.monitoringPeriodInputId};inputs.find(i=>i.id===data.monitoringPeriodInputId).result=result;return result;});
 db.kpiResult.updateMany.mockImplementation(async({where,data}:any)=>{if(where.input){for(const input of inputs)if(input.result)Object.assign(input.result,data);return{count:inputs.length};}const input=inputs.find(i=>i.result?.id===where.id);if(input.result.version!==where.version)return{count:0};input.result={...input.result,resultValue:data.resultValue,version:input.result.version+1,revisionNo:input.result.revisionNo+1};return{count:1};});
});
const save=(values:Array<[string,string|null,number|null]>,resultsVersion=period.resultsVersion)=>resultEntryService.save("1",{resultsVersion,changes:values.map(([monitoringPeriodInputId,resultValue,version])=>({monitoringPeriodInputId,resultValue,version}))},7n);
describe("Manual Results V1",()=>{
 it("saves three independent entity Results, including zero, with frozen weights and no Group input",async()=>{
  const result=await save([["1","0",null],["2","58200",null],["3","52000",null]]);
  expect(result.summary).toEqual({expected:4,entered:3,pending:1,completionPercent:75});
  expect(result.inputs.map((i:any)=>i.weight)).toEqual(["10","8","7","5"]);
  expect(result.inputs.map((i:any)=>i.resultValue)).toEqual(["0","58200","52000",null]);
  expect(result.inputs[0]).toMatchObject({goal:"80000",unit:"USD",subject:{label:"Jacky"},groupGoal:{value:"250000"}});
  expect(result.monitoringPeriod).toMatchObject({resultsVersion:1,selectedEntryMethod:"MANUAL"});
  expect(recalculate).not.toHaveBeenCalled();
 });
 it("preserves exact decimals and audits edits and clears without fake no-op revisions",async()=>{
  await save([["1","12345678901234.123456",null]]);
  const noOp=await save([["1","12345678901234.123456",1]]);
  expect(noOp.monitoringPeriod.resultsVersion).toBe(1);expect(db.kpiResultRevision.create).toHaveBeenCalledTimes(1);
  await save([["1","120",1]]);await save([["1",null,2]]);
  expect(period.resultsVersion).toBe(3);expect(db.kpiResultRevision.create).toHaveBeenCalledTimes(3);
  expect(db.kpiResultRevision.create.mock.calls[2]![0].data).toMatchObject({changeType:"CLEAR",entrySource:"MANUAL",changedByUserId:7n,newResultValue:null});
 });
 it("selects Manual without creating a Result for null or changing resultsVersion",async()=>{
  await save([["1",null,null]]);await save([]);
  expect(period.selectedEntryMethod).toBe("MANUAL");expect(period.resultsVersion).toBe(0);expect(db.resultEntryBatch.create).not.toHaveBeenCalled();
 });
 it("counts one OVERALL Result and persists zero",async()=>{inputs.splice(1);inputs[0].evaluationKindSnapshot="OVERALL";const result=await save([["1","0",null]]);expect(result.summary).toEqual({expected:1,entered:1,pending:0,completionPercent:100});expect((await resultEntryService.get("1")).inputs[0].resultValue).toBe("0");});
 it("rejects obsolete aggregate and row versions",async()=>{
  await expect(save([["1","1",null]],99)).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
  await save([["1","1",null]]);await expect(save([["1","2",null]])).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
 });
 it("rejects foreign and duplicate evaluation IDs",async()=>{
  await expect(save([["99","1",null]])).rejects.toMatchObject({code:"MONITORING_INPUT_NOT_IN_PERIOD"});
  await expect(save([["1","1",null],["1","2",null]])).rejects.toMatchObject({code:"DUPLICATE_RESULT_CHANGE"});
 });
 it.each(["SUBMITTED","VALIDATED","CLOSED"])("rejects writes in %s",async(status)=>{period.status.code=status;await expect(save([["1","1",null]])).rejects.toMatchObject({code:"MONITORING_PERIOD_NOT_DRAFT"});});
 it("rejects method mixing and Excel writes",async()=>{
  period.selectedEntryMethod="EXCEL";await expect(save([])).rejects.toMatchObject({code:"ENTRY_METHOD_CONFLICT"});
  await expect(resultEntryService.save("1",{resultsVersion:0,changes:[]},7n,"EXCEL")).rejects.toMatchObject({code:"ENTRY_METHOD_NOT_SUPPORTED"});
 });
 it.each(["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"])("blocks incomplete legacy %s contracts without baseline lookup",async(reference)=>{inputs[0].effectiveSettingsSnapshot.periodScope=reference;await expect(save([["1","1",null]])).rejects.toMatchObject({code:"HISTORICAL_CONTRACT_INVALID"});});
 it("respects blocked executability and never saves Group Results",async()=>{inputs[0].effectiveSettingsSnapshot.executability.executable=false;await expect(save([["1","1",null]])).rejects.toMatchObject({code:"KPI_CONFIGURATION_NOT_EXECUTABLE"});inputs[0].evaluationKindSnapshot="GROUP";await expect(save([["1","1",null]])).rejects.toMatchObject({code:"GROUP_RESULT_RUNTIME_UNSUPPORTED"});});
});

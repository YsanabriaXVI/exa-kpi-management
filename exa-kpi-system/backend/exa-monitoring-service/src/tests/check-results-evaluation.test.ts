import { describe, expect, it } from "vitest";
import { evaluateCheck } from "../services/check-results-evaluation.js";

import { checkInputs, checkCards, frozen } from "./fixtures/check-results.js";

describe("Check Results frozen evaluations",()=>{
 it("scores entities independently, excludes Group and reports 30% coverage without normalizing",()=>{
  const result=evaluateCheck(checkInputs(),checkCards(),"MANUAL");
  expect(result.evaluations.map(r=>r.weightedContribution)).toEqual(["10.000000","7.760000","7.000000","4.950000"]);
  expect(result.evaluations.map(r=>r.goalMet)).toEqual([true,false,true,false]);
  expect(result.evaluations.map(r=>r.groupEvaluation)).toEqual(Array(4).fill("NOT_AVAILABLE"));
  expect(result.scorecards[0]).toMatchObject({weightCoverage:"30.000000",score:"29.710000",scoreStatus:"PARTIAL"});
  expect(result.findings).toEqual([expect.objectContaining({code:"WEIGHT_COVERAGE_INVALID",blocking:true})]);
 });
 it("allows partial checks with explicit missing identity and no fake zero scoring",()=>{
  const inputs:any[]=checkInputs();inputs[3].result=null;
  const result=evaluateCheck(inputs,checkCards(),"MANUAL");
  expect(result.summary).toMatchObject({expected:4,entered:3,pending:1,completionPercent:75,readyForSubmit:false});
  expect(result.evaluations[3]).toMatchObject({status:"NOT_CALCULABLE",goalMet:null,compliancePercent:null,trafficLight:null,weightedContribution:null});
  expect(result.findings).toContainEqual(expect.objectContaining({code:"RESULT_MISSING",entityLabel:"Ana",entityId:"4",monitoringPeriodInputId:"4"}));
  expect(result.scorecards[0]).toMatchObject({scoreStatus:"PARTIAL",calculableWeight:"25.000000",pendingWeight:"5.000000"});
 });
 it("adds OVERALL weight once to reach 100%, and sums contributions",()=>{
  const inputs:any[]=checkInputs();inputs.push({...inputs[0],id:10n,evaluationKindSnapshot:"OVERALL",subjectExternalIdSnapshot:null,subjectLabelSnapshot:null,goalValueSnapshot:"100",weightPercentSnapshot:"70",effectiveSettingsSnapshot:{...frozen,evaluationScope:"OVERALL",subjectGoals:[],goal:"100",groupGoal:null},result:{id:10n,resultValue:"90"}});
  const result=evaluateCheck(inputs,checkCards(),"MANUAL");
  expect(result.scorecards[0]).toMatchObject({weightCoverage:"100.000000",score:"92.710000",scoreStatus:"COMPLETE"});
  expect(result.summary.readyForSubmit).toBe(true);
 });
 it.each([null,{...frozen,periodScope:"PREVIOUS_PERIOD"},{...frozen,scoringMethod:"BINARY"}])("rejects invalid, historical and unsupported contracts",contract=>{
  const inputs:any[]=checkInputs();inputs[0].effectiveSettingsSnapshot=contract;
  const result=evaluateCheck(inputs,checkCards(),"MANUAL");
  expect(result.evaluations[0]).toMatchObject({status:"NOT_CALCULABLE",compliancePercent:null,goalMet:null});
  expect(result.findings.some(f=>f.monitoringPeriodInputId==="1"&&f.blocking)).toBe(true);
 });
});

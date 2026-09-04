import { describe, expect, it } from "vitest";
import { evaluateKpiExecutability } from "../domain/kpi-executability.js";

const valid = { active:true,evaluationScope:"OVERALL",periodScope:"CURRENT_PERIOD",goal:"100",goalMode:"SINGLE",goalUnit:{id:"1"},measurementUnit:{id:"2"},dataSource:{id:"3"},frequencyCode:"MONTHLY",evaluationType:{code:"GREATER_IS_BETTER"},resultSemantics:"ABSOLUTE_VALUE",scoringMethod:"PROPORTIONAL",scoringApprovalStatus:"APPROVED",resultMethod:"DIRECT",thresholds:["RED","YELLOW","GREEN"].map((code)=>({code,rangeMinPercent:"0",rangeMaxPercent:"100"})) };

describe("KPI executability V1",()=>{
  it("accepts a complete current-period Overall configuration",()=>expect(evaluateKpiExecutability(valid)).toMatchObject({executable:true,status:"EXECUTABLE",reasons:[]}));
  it("accepts one stable Goal for every BY_ENTITY subject",()=>expect(evaluateKpiExecutability({...valid,evaluationScope:"BY_SUBJECT",subjectType:"EMPLOYEE",subjects:[{subjectExternalId:"A"},{subjectExternalId:"B"}],subjectGoals:[{subjectExternalId:"A",goal:"10"},{subjectExternalId:"B",goal:"20"}]}).executable).toBe(true));
  it("blocks incomplete, historical, and duplicate BY_ENTITY cohorts",()=>{
    const result=evaluateKpiExecutability({...valid,evaluationScope:"BY_SUBJECT",periodScope:"PREVIOUS_PERIOD",subjectType:"EMPLOYEE",subjects:[{subjectExternalId:"A"},{subjectExternalId:"A"}],subjectGoals:[{subjectExternalId:"A",goal:null}]});
    expect(result.reasons.map((reason)=>reason.code)).toEqual(expect.arrayContaining(["HISTORICAL_COMPARISON_RUNTIME_NOT_SUPPORTED","DUPLICATE_SUBJECT_ID","SUBJECT_GOAL_REQUIRED"]));
  });
  it("blocks Group Goal without inventing Group Result semantics",()=>expect(evaluateKpiExecutability({...valid,groupGoal:{value:"2500"}}).reasons).toContainEqual(expect.objectContaining({code:"GROUP_GOAL_RUNTIME_UNDEFINED"})));
});

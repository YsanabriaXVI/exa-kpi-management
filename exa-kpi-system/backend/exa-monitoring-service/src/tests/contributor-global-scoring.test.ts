import { describe, expect, it } from "vitest";
import { sumContributorResults } from "../services/contributor-results.js";
import { calculateKpiScore } from "../services/scoring-engine.js";
import { historicalComparison } from "../services/historical-comparison.js";
const settings = {evaluationScope:"BY_SUBJECT",entityEvaluationMode:"CONTRIBUTE_TO_OVERALL",entityAggregation:"SUM",subjectType:"SUBDIVISIONS",subjects:[{subjectExternalId:"A",subjectLabel:"A"},{subjectExternalId:"B",subjectLabel:"B"}],subjectGoals:[],goalAssignment:null,resultMethod:"DIRECT",periodScope:"CURRENT_PERIOD",goal:"100",goalUnit:{code:"USD",symbol:"USD"},measurementUnit:{code:"USD",symbol:"USD"},resultSemantics:"ABSOLUTE_VALUE",negativeResultPolicy:"DISALLOW"};
const total = (a:string,b:string) => sumContributorResults(settings,[{subjectType:"SUBDIVISIONS",subjectExternalId:"A",resultValue:a},{subjectType:"SUBDIVISIONS",subjectExternalId:"B",resultValue:b}]);
const score = (result:any,goal:string,behavior:string,config:any,method="PROPORTIONAL") => calculateKpiScore({result,goal,evaluationType:behavior,scoringMethod:method,scoringRuleConfig:config,negativeResultPolicy:"DISALLOW",scoringApprovalStatus:"APPROVED",weight:"100",thresholds:[{code:"RED",min:"0",max:"65",includesMin:true,includesMax:false,displayOrder:1},{code:"YELLOW",min:"65",max:"80",includesMin:true,includesMax:false,displayOrder:2},{code:"GREEN",min:"80",max:"100",includesMin:true,includesMax:true,displayOrder:3}]});
describe("One global score after contributor SUM",()=>{
  it("evaluates lower-is-better on the total, not individual scores",()=>{
    const summed=total("40","80");expect(summed.errorCode).toBeNull();expect(summed.value?.toString()).toBe("120");
    expect(score(summed.value,"100","LOWER_IS_BETTER",{floorPercent:0,capPercent:100}).compliance?.toNumber()).toBeCloseTo(83.333333);
  });
  it("applies zero-target bands once to the total",()=>{
    const bands=[{minResult:0,maxResult:0,compliance:100},{minResult:0,includesMin:false,maxResult:2,compliance:70},{minResult:2,includesMin:false,maxResult:null,compliance:0}];
    expect(score(total("1","2").value,"0","ZERO_IS_BETTER",{bands},"RESULT_BANDS").compliance?.toNumber()).toBe(0);
    expect(score(total("0","0").value,"0","ZERO_IS_BETTER",{bands},"RESULT_BANDS").compliance?.toNumber()).toBe(100);
  });
  it("compares the current total to the historical total before scoring the reduction",()=>{
    const comparison=historicalComparison(total("30","50").value,{resolution:{value:"100"},comparisonDirection:"REDUCTION"});
    expect(comparison.achievedChangePercent).toBe("20");
    expect(score(comparison.achievedChangePercent,"25","HIGHER_IS_BETTER",{floorPercent:0,capPercent:100}).compliance?.toNumber()).toBe(80);
  });
});

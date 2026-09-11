import { describe, expect, it } from "vitest";
import { kpiConfigurationBodySchema } from "../schemas/kpi-configuration.schema.js";
const base = { definitionId:"1", goal:10, goalUnit:"%", measurementUnit:"%", dataSource:"Manual", evaluationTypeCode:"HIGHER_IS_BETTER", resultSemantics:"ABSOLUTE_VALUE", targetKind:"ABSOLUTE_TARGET", scoringMethod:"PROPORTIONAL", negativeResultPolicy:"DISALLOW", scoringApprovalStatus:"APPROVED", scoringRuleConfigVersion:1, scoringRuleConfig:{model:"SINGLE_RESULT_V1",floorPercent:0,capPercent:100}, ranges:{redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100} };
describe("Single result configuration contract",()=>{
  it("allows a percentage result and a backdated effective date",()=>{
    expect(kpiConfigurationBodySchema.parse({...base,effectiveFrom:"2023-01-01"})).toMatchObject({periodScope:"CURRENT_PERIOD",evaluationScope:"OVERALL",resultMethod:"DIRECT",goalUnit:"%",measurementUnit:"%",effectiveFrom:"2023-01-01"});
  });
  it.each([{measurementUnit:"USD"},{periodScope:"PREVIOUS_PERIOD"},{evaluationScope:"BY_SUBJECT"},{resultMethod:"CALCULATED_FROM_INPUTS"},{negativeResultPolicy:"REVIEW"},{scoringRuleConfig:{...base.scoringRuleConfig,capPercent:80}}])("rejects legacy configuration fields: %j",override=>{
    expect(kpiConfigurationBodySchema.safeParse({...base,...override}).success).toBe(false);
  });
  it("requires complete upper-inclusive bands and supports negative boundaries",()=>{
    const bands=[{minResult:null,maxResult:-5,compliance:100,includesMin:true,includesMax:true},{minResult:-5,maxResult:0,compliance:50,includesMin:false,includesMax:true},{minResult:0,maxResult:5,compliance:20,includesMin:false,includesMax:true},{minResult:5,maxResult:null,compliance:0,includesMin:false,includesMax:true}];
    const input={...base,evaluationTypeCode:"LOWER_IS_BETTER",negativeResultPolicy:"ALLOW",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{...base.scoringRuleConfig,bandMode:"INTERVALS",bands}};
    expect(kpiConfigurationBodySchema.safeParse(input).success).toBe(true);
    expect(kpiConfigurationBodySchema.safeParse({...input,scoringRuleConfig:{...input.scoringRuleConfig,bandMode:"LINEAR_POINTS"}}).success).toBe(false);
    expect(kpiConfigurationBodySchema.safeParse({...input,scoringRuleConfig:{...input.scoringRuleConfig,bands:bands.slice(0,3)}}).success).toBe(false);
  });
});

it("accepts exact points with gaps and rejects implicit ranges or misplaced tails",()=>{
 const bands=[{minResult:0,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:65},{minResult:2,maxResult:null,compliance:0}];
 const input={...base,goal:0,evaluationTypeCode:"ZERO_IS_BETTER",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{...base.scoringRuleConfig,bandMode:"EXACT_POINTS",bands}};
 expect(kpiConfigurationBodySchema.safeParse(input).success).toBe(true);
 for(const invalid of [[{...bands[0],maxResult:0.5},...bands.slice(1)],[bands[0],bands[2],bands[1]],[bands[0],bands[0]], [{minResult:-2,maxResult:null,compliance:100}]]) {
   expect(kpiConfigurationBodySchema.safeParse({...input,scoringRuleConfig:{...input.scoringRuleConfig,bands:invalid}}).success).toBe(false);
 }
});

it("allows an explicit first N or lower row",()=>{
 const bands=[{minResult:null,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:65},{minResult:2,maxResult:null,compliance:0}];
 const input={...base,goal:0,evaluationTypeCode:"ZERO_IS_BETTER",negativeResultPolicy:"ALLOW",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{...base.scoringRuleConfig,bandMode:"EXACT_POINTS",bands}};
 expect(kpiConfigurationBodySchema.safeParse(input).success).toBe(true);
 expect(kpiConfigurationBodySchema.safeParse({...input,scoringRuleConfig:{...input.scoringRuleConfig,bands:[bands[1],bands[0],bands[2]]}}).success).toBe(false);
});

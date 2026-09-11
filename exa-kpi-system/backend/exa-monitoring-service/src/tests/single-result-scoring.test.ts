import { describe, expect, it } from "vitest";
import { calculateKpiScore, extraPoints } from "../services/scoring-engine.js";
const score = (result:number,goal:number,overrides:Record<string,unknown>={}) => calculateKpiScore({result,goal,weight:20,evaluationType:"HIGHER_IS_BETTER",scoringMethod:"PROPORTIONAL",scoringApprovalStatus:"APPROVED",negativeResultPolicy:"DISALLOW",scoringRuleConfig:{model:"SINGLE_RESULT_V1",floorPercent:0,capPercent:100},thresholds:[{code:"RED",min:0,max:59,includesMin:true,includesMax:true,displayOrder:1},{code:"YELLOW",min:60,max:79,includesMin:true,includesMax:true,displayOrder:2},{code:"GREEN",min:80,max:100,includesMin:true,includesMax:true,displayOrder:3}],...overrides});
describe("Single final result scoring",()=>{
  it.each([[3325,3500,95],[8,10,80],[115,100,100]])("converts Result %s / Goal %s into Compliance %s",(result,goal,compliance)=>{expect(score(result,goal).compliance?.toNumber()).toBe(compliance);});
  it("keeps extra points separate from compliance, traffic and weighted contribution",()=>{
    const r=score(115,100);expect(extraPoints(r.rawAchievement,r.compliance)?.toNumber()).toBe(15);
    expect(r.trafficLight).toBe("GREEN");expect(r.weightedScore?.toNumber()).toBe(20);
    expect(extraPoints(null,null)).toBeNull();
  });
  it("inverts lower-is-better",()=>{expect(score(6,5,{evaluationType:"LOWER_IS_BETTER"}).compliance?.toNumber()).toBe(83.333333);});
  it("uses upper-inclusive negative intervals",()=>{
    const bands=[{minResult:null,maxResult:-5,compliance:100,includesMin:true,includesMax:true},{minResult:-5,maxResult:0,compliance:50,includesMin:false,includesMax:true},{minResult:0,maxResult:5,compliance:20,includesMin:false,includesMax:true},{minResult:5,maxResult:null,compliance:0,includesMin:false,includesMax:true}];
    for(const [result,compliance] of [[-10,100],[-5,100],[-2,50],[0,50],[3,20],[7,0]]) expect(score(result!,5,{evaluationType:"LOWER_IS_BETTER",negativeResultPolicy:"ALLOW",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{bands}}).compliance?.toNumber()).toBe(compliance);
  });
  it("scores zero incidents without dividing by zero",()=>{
    const bands=[{minResult:0,maxResult:0,compliance:100,includesMin:true,includesMax:true},{minResult:0,maxResult:1,compliance:80,includesMin:false,includesMax:true},{minResult:1,maxResult:2,compliance:50,includesMin:false,includesMax:true},{minResult:2,maxResult:null,compliance:0,includesMin:false,includesMax:true}];
    for(const [result,compliance] of [[0,100],[1,80],[2,50],[3,0]]) expect(score(result!,0,{evaluationType:"ZERO_IS_BETTER",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{bands}}).compliance?.toNumber()).toBe(compliance);
  });
});

it("matches exact points without implicit intervals, and applies only the explicit N+ tail",()=>{
 const config={bandMode:"EXACT_POINTS",bands:[{minResult:0,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:65},{minResult:2,maxResult:null,compliance:0}]};
 for(const [result,compliance] of [[0,100],[1,65],[2,0],[3,0],[100,0],[2.7,0]]) expect(score(result!,0,{evaluationType:"ZERO_IS_BETTER",scoringMethod:"RESULT_BANDS",scoringRuleConfig:config}).compliance?.toNumber()).toBe(compliance);
 for(const result of [0.5,1.37]) expect(score(result,0,{evaluationType:"ZERO_IS_BETTER",scoringMethod:"RESULT_BANDS",scoringRuleConfig:config})).toMatchObject({status:"NOT_CALCULABLE",errorCode:"SCORING_RULE_NOT_CONFIGURED"});
 expect(score(1,0,{evaluationType:"ZERO_IS_BETTER",scoringMethod:"RESULT_BANDS",scoringRuleConfig:{...config,bands:[{minResult:0,maxResult:1,compliance:100}]}})).toMatchObject({status:"NOT_CALCULABLE",errorCode:"SCORING_BANDS_INVALID"});
});

it("applies explicit N or lower, exact points and N+ without filling gaps",()=>{
 const config={bandMode:"EXACT_POINTS",bands:[{minResult:null,maxResult:-5,compliance:100},{minResult:0,maxResult:0,compliance:50},{minResult:2,maxResult:null,compliance:0}]};
 for(const [result,compliance] of [[-20,100],[-5,100],[0,50],[2,0],[100,0]]) expect(score(result!,5,{evaluationType:"LOWER_IS_BETTER",negativeResultPolicy:"ALLOW",scoringMethod:"RESULT_BANDS",scoringRuleConfig:config}).compliance?.toNumber()).toBe(compliance);
 for(const result of [-2.7,1]) expect(score(result,5,{evaluationType:"LOWER_IS_BETTER",negativeResultPolicy:"ALLOW",scoringMethod:"RESULT_BANDS",scoringRuleConfig:config}).status).toBe("NOT_CALCULABLE");
});

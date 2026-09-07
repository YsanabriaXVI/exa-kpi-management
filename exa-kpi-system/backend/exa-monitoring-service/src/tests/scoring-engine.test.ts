import { describe, expect, it } from "vitest";
import { calculateKpiScore, calculateScorecardScores } from "../services/scoring-engine.js";

const thresholds = [
  { code: "RED", min: "0", max: "65", includesMin: true, includesMax: false, displayOrder: 1 },
  { code: "YELLOW", min: "65", max: "80", includesMin: true, includesMax: false, displayOrder: 2 },
  { code: "GREEN", min: "80", max: null, includesMin: true, includesMax: false, displayOrder: 3 },
];
const score = (overrides: Record<string, unknown>) => calculateKpiScore({ result: "90", goal: "100", evaluationType: "GREATER_IS_BETTER", scoringMethod: "PROPORTIONAL", scoringRuleConfig:{floorPercent:0,capPercent:100}, negativeResultPolicy:"DISALLOW",scoringApprovalStatus:"APPROVED", thresholds, weight: "20", ...overrides });

describe("KPI scoring engine", () => {
  it("calculates greater-is-better and preserves overachievement while capping compliance", () => {
    expect(score({ result: "90" })).toMatchObject({ status: "CALCULATED", trafficLight: "GREEN" });
    expect(score({ result: "90" }).rawAchievement?.toString()).toBe("90");
    const over = score({ result: "130" });
    expect(over.rawAchievement?.toString()).toBe("130");
    expect(over.compliance?.toString()).toBe("100");
    expect(over.weightedScore?.toString()).toBe("20");
  });

  it("inverts proportional scoring for lower-is-better", () => {
    expect(score({ evaluationType: "LOWER_IS_BETTER", result: "120" }).rawAchievement?.toDecimalPlaces(2).toString()).toBe("83.33");
    expect(score({ evaluationType: "LOWER_IS_BETTER", result: "80" }).rawAchievement?.toString()).toBe("125");
  });

  it("treats null as missing and zero as a real result", () => {
    expect(score({ result: null })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "RESULT_MISSING", compliance: null, trafficLight: null, weightedScore: null });
    expect(score({ evaluationType: "LOWER_IS_BETTER", scoringMethod: "ZERO_TARGET_BANDS", goal: "0", result: "0", scoringRuleConfig:{bands:[{minResult:0,maxResult:0,compliance:100}]} })).toMatchObject({ status: "CALCULATED", trafficLight: "GREEN" });
  });

  it("requires an explicit zero-target degradation rule for incidents above zero", () => {
    expect(score({ evaluationType: "LOWER_IS_BETTER", scoringMethod: "ZERO_TARGET_BANDS", goal: "0", result: "1" })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "SCORING_RULE_NOT_CONFIGURED" });
    const configured = score({ evaluationType: "LOWER_IS_BETTER", scoringMethod: "ZERO_TARGET_BANDS", goal: "0", result: "2", scoringRuleConfig: { bands: [
      { minResult: "1", maxResult: "1", compliance: "70" }, { minResult: "2", maxResult: "2", compliance: "40" }, { minResult: "3", compliance: "0" },
    ] } });
    expect(configured).toMatchObject({ status: "CALCULATED", trafficLight: "RED" });
    expect(configured.compliance?.toString()).toBe("40");
  });

  it.each(["TOLERANCE", "TOLERANCE_BASED", "RANGE_BASED", "BINARY", "MILESTONE"])("rejects unsupported %s",scoringMethod=>{
    expect(score({scoringMethod})).toMatchObject({status:"NOT_CALCULABLE",compliance:null,goalMet:null});
  });
  it("uses explicit frozen zero bands even for zero",()=>{
    const config={bands:[{minResult:0,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:70},{minResult:2,compliance:0}]};
    for(const [result,compliance,goalMet] of [["0","100",true],["1","70",false],["2","0",false]] as const){
      const calculated=score({evaluationType:"ZERO_IS_BETTER",scoringMethod:"ZERO_TARGET_BANDS",goal:0,result,scoringRuleConfig:config});
      expect(calculated.compliance?.toString()).toBe(compliance);expect(calculated.goalMet).toBe(goalMet);expect(calculated.rawAchievement).toBeNull();
    }
  });
  it("handles lower zero at frozen cap and keeps Goal Met separate from Traffic",()=>{
    const zero=score({evaluationType:"LOWER_IS_BETTER",goal:5,result:0,scoringRuleConfig:{floorPercent:0,capPercent:90}});
    expect(zero.compliance?.toString()).toBe("90");expect(zero.rawAchievement?.isFinite()).toBe(true);expect(zero.goalMet).toBe(true);
    expect(score({evaluationType:"LOWER_IS_BETTER",goal:5,result:6})).toMatchObject({goalMet:false,trafficLight:"GREEN"});
    expect(score({goal:4500,result:4782}).rawAchievement?.toFixed(6)).toBe("106.266667");
  });
  it("rejects overlapping thresholds, gaps at the computed value and missing caps",()=>{
    expect(score({thresholds:[thresholds[0],thresholds[0]]})).toMatchObject({status:"NOT_CALCULABLE"});
    expect(score({thresholds:[thresholds[0]]})).toMatchObject({status:"NOT_CALCULABLE"});
    expect(score({scoringRuleConfig:{}})).toMatchObject({errorCode:"COMPLIANCE_LIMITS_MISSING"});
  });

  it("does not infer missing or unapproved scoring configuration", () => {
    expect(score({ scoringMethod: null })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "SCORING_METHOD_NOT_CONFIGURED" });
    expect(score({ scoringApprovalStatus: "BLOCKED" })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "SCORING_CONFIGURATION_NOT_APPROVED", calculationVersion:"CHECK_RESULTS_V1" });
    expect(score({ scoringMethod: "BINARY" })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "UNSUPPORTED_SCORING_COMBINATION" });
    expect(score({ thresholds: [] })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED" });
  });
});

describe("Scorecard scoring engine", () => {
  it("aggregates direct KPIs and linked Scorecards from leaves upward", () => {
    const scores = calculateScorecardScores([
      { id: "A", directContributions: ["75"], links: [{ scorecardId: "B", weight: "20" }] },
      { id: "B", directContributions: ["90"], links: [] },
    ]);
    expect(scores.get("B")?.toString()).toBe("90");
    expect(scores.get("A")?.toString()).toBe("93");
  });

  it("keeps an incomplete scorecard null and rejects cycles", () => {
    expect(calculateScorecardScores([{ id: "A", directContributions: [null], links: [] }]).get("A")).toBeNull();
    expect(() => calculateScorecardScores([
      { id: "A", directContributions: [], links: [{ scorecardId: "B", weight: "50" }] },
      { id: "B", directContributions: [], links: [{ scorecardId: "A", weight: "50" }] },
    ])).toThrow("SCORECARD_DEPENDENCY_CYCLE");
  });
});

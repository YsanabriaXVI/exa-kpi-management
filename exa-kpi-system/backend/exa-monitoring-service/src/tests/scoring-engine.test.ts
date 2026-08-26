import { describe, expect, it } from "vitest";
import { calculateKpiScore, calculateScorecardScores } from "../services/scoring-engine.js";

const thresholds = [
  { code: "RED", min: "0", max: "65", includesMin: true, includesMax: false, displayOrder: 1 },
  { code: "YELLOW", min: "65", max: "80", includesMin: true, includesMax: false, displayOrder: 2 },
  { code: "GREEN", min: "80", max: null, includesMin: true, includesMax: false, displayOrder: 3 },
];
const score = (overrides: Record<string, unknown>) => calculateKpiScore({ result: "90", goal: "100", evaluationType: "GREATER_IS_BETTER", thresholds, weight: "20", ...overrides });

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

  it("treats null as pending and zero as a real result", () => {
    expect(score({ result: null })).toMatchObject({ status: "PENDING", compliance: null });
    expect(score({ evaluationType: "LOWER_IS_BETTER", goal: "0", result: "0" })).toMatchObject({ status: "CALCULATED", trafficLight: "GREEN" });
  });

  it("requires an explicit zero-target degradation rule for incidents above zero", () => {
    expect(score({ evaluationType: "LOWER_IS_BETTER", goal: "0", result: "1" })).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "SCORING_RULE_NOT_CONFIGURED" });
    const configured = score({ evaluationType: "LOWER_IS_BETTER", goal: "0", result: "2", scoringRuleConfig: { bands: [
      { minResult: "1", maxResult: "1", compliance: "70" }, { minResult: "2", maxResult: "2", compliance: "40" }, { minResult: "3", compliance: "0" },
    ] } });
    expect(configured).toMatchObject({ status: "CALCULATED", trafficLight: "RED" });
    expect(configured.compliance?.toString()).toBe("40");
  });

  it("scores equality by tolerance and range by distance bands", () => {
    expect(score({ evaluationType: "EQUAL_IS_BETTER", result: "5.4", goal: "5", scoringRuleConfig: { tolerance: ".5", bands: [{ maxDistance: ".5", compliance: "70" }, { maxDistance: "1", compliance: "40" }] } }).compliance?.toString()).toBe("100");
    expect(score({ evaluationType: "EQUAL_IS_BETTER", result: "5.8", goal: "5", scoringRuleConfig: { tolerance: ".5", bands: [{ maxDistance: ".5", compliance: "70" }] } }).compliance?.toString()).toBe("70");
    expect(score({ evaluationType: "RANGE", result: "8", scoringRuleConfig: { rangeMin: "2", rangeMax: "8", bands: [{ maxDistance: "2", compliance: "70" }] } }).compliance?.toString()).toBe("100");
    expect(score({ evaluationType: "RANGE", result: "9", scoringRuleConfig: { rangeMin: "2", rangeMax: "8", bands: [{ maxDistance: "2", compliance: "70" }] } }).compliance?.toString()).toBe("70");
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

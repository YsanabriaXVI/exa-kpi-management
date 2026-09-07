import { describe, expect, it } from "vitest";
import { hasCurrentScoring, maskStaleScoring } from "../services/scoring-validity.js";

describe("Current scoring validity", () => {
  it("uses only the Results version, including zero, and rejects unknown legacy versions", () => {
    expect(hasCurrentScoring({resultsVersion:4,currentScoringResultsVersion:4})).toBe(true);
    expect(hasCurrentScoring({resultsVersion:0,currentScoringResultsVersion:0})).toBe(true);
    expect(hasCurrentScoring({resultsVersion:5,currentScoringResultsVersion:4})).toBe(false);
    expect(hasCurrentScoring({resultsVersion:0,currentScoringResultsVersion:null})).toBe(false);
    expect(hasCurrentScoring({})).toBe(false);
  });
  it("masks stale materialized values and nested attached KPIs without losing Results or history", () => {
    const historical = {basedOnResultsVersion:4, scoringSnapshot:{compliancePercent:100}};
    const period:any = {version:4,resultsVersion:5,currentScoringResultsVersion:4,validationStatus:"PASSED",validationSummary:{passed:1},validationRuns:[historical],inputs:[{result:{resultValue:"20",compliancePercent:100,trafficLightCode:"GREEN"}}],scorecards:[{previewScorePercent:100,finalScorePercent:100,inputs:[{result:{resultValue:"20",weightedScorePoints:10,trafficLightCode:"GREEN"}}]}]};
    maskStaleScoring(period);
    expect(period.inputs[0].result).toMatchObject({resultValue:"20",compliancePercent:null,trafficLightCode:null});
    expect(period.scorecards[0]).toMatchObject({previewScorePercent:null,finalScorePercent:null});
    expect(period.scorecards[0].inputs[0].result.weightedScorePoints).toBeNull();
    expect(period.validationSummary).toBeNull();
    expect(period.validationRuns[0]).toEqual(historical);
  });
});

import { describe,it,expect } from "vitest";
import { frozen,checkInputs,checkCards } from "./fixtures/check-results.js";
import { requiredHistoricalPeriod } from "../services/historical-period.js";
import { evaluateCheck } from "../services/check-results-evaluation.js";
import { historicalContractError } from "../contracts/historical-contract.js";
import { isCurrentRun,hasCurrentScoring } from "../services/scoring-validity.js";

export const historicalFrozen = (reference="PREVIOUS_PERIOD",direction="INCREASE"):any => ({
  ...structuredClone(frozen),periodScope:reference,comparisonMode:reference,comparisonDirection:direction,targetKind:"CHANGE_TARGET",
  historicalCapabilityVersion:"HISTORICAL_COMPARISON_V1",inputFrequency:{id:"1",code:"MONTHLY",monthsPerPeriod:1},
  goalUnit:{id:"2",code:"PERCENT",name:"Percent",symbol:"%"},subjectGoals:frozen.subjectGoals.map(s=>({...s,goal:"10"})),
});
const period={periodStart:new Date("2026-08-01"),periodEnd:new Date("2026-08-31"),inputFrequencyCodeSnapshot:"MONTHLY"};
describe("Historical period and scoring context",()=>{
  it.each([["PREVIOUS_PERIOD","2026-07"],["SAME_PERIOD_PREVIOUS_YEAR","2025-08"]])("resolves exact %s", (ref,key)=>{
    expect(requiredHistoricalPeriod(period,historicalFrozen(ref))?.key).toBe(key);
  });
  it.each([1,3,4,6,12])("resolves previous and previous year for %i-month cadence",months=>{
    const start=new Date(Date.UTC(2026,0,1)),end=new Date(Date.UTC(2026,months,0));
    const f=historicalFrozen();f.inputFrequency.monthsPerPeriod=months;f.inputFrequency.code="CADENCE";
    const p={periodStart:start,periodEnd:end,inputFrequencyCodeSnapshot:"CADENCE"};
    expect(requiredHistoricalPeriod(p,f)?.start).toBe(new Date(Date.UTC(2026,-months,1)).toISOString().slice(0,10));
    f.periodScope=f.comparisonMode="SAME_PERIOD_PREVIOUS_YEAR";
    expect(requiredHistoricalPeriod(p,f)?.start).toBe("2025-01-01");
  });
  it("rejects missing intent and nonaligned periods instead of guessing",()=>{
    const f=historicalFrozen();delete f.comparisonDirection;
    expect(historicalContractError(f)).toBe("HISTORICAL_CONTRACT_INVALID");
    expect(requiredHistoricalPeriod({...period,periodStart:new Date("2026-08-02")},historicalFrozen())).toBeNull();
  });
  it.each([
    ["INCREASE","115000","100000","150.000000","100.000000",true],
    ["REDUCTION","85000","100000","150.000000","100.000000",true],
    ["REDUCTION","95000","100000","50.000000","50.000000",false],
    ["INCREASE","95000","100000","-50.000000","0.000000",false],
  ])("normalizes %s current %s through the existing engine",(direction,current,baseline,raw,compliance,met)=>{
    const inputs:any[]=checkInputs();inputs[0].effectiveSettingsSnapshot=historicalFrozen("PREVIOUS_PERIOD",direction);inputs[0].goalValueSnapshot="10";inputs[0].result.resultValue=current;
    const contexts=new Map([["1",{state:"MANUAL",resolution:{value:baseline},requiredPeriod:{key:"2026-07"}}]]);
    const row=evaluateCheck(inputs,checkCards(),"MANUAL",contexts).evaluations[0]!;
    expect(row).toMatchObject({status:"CALCULATED",rawAchievementPercent:raw,compliancePercent:compliance,goalMet:met,
      weightedContribution:compliance==="100.000000"?"10.000000":compliance==="50.000000"?"5.000000":"0.000000"});
  });
  it("leaves only unresolved/zero entities uncalculable and never weights Group Goal",()=>{
    const inputs:any[]=checkInputs();
    inputs.forEach(i=>{i.effectiveSettingsSnapshot=historicalFrozen();i.goalValueSnapshot="10";i.result.resultValue="115000";});
    const contexts=new Map([["1",{resolution:{value:"100000"}}],["2",{resolution:{value:"100000"}}],["3",{resolution:{value:"0"}}]]);
    const report=evaluateCheck(inputs,checkCards(),"MANUAL",contexts);
    expect(report.evaluations.map(e=>e.status)).toEqual(["CALCULATED","CALCULATED","NOT_CALCULABLE","NOT_CALCULABLE"]);
    expect(report.findings.map(f=>f.code)).toContain("HISTORICAL_BASELINE_ZERO_UNDEFINED");
    expect(report.findings.map(f=>f.code)).toContain("HISTORICAL_BASELINE_MISSING");
    expect(report.scorecards[0]).toMatchObject({scoreStatus:"PARTIAL",score:"18.000000"});
    expect(report.evaluations.every(e=>e.groupEvaluation==="NOT_AVAILABLE")).toBe(true);
  });
  it("requires both context versions at every validity boundary",()=>{
    const p={resultsVersion:5,baselineVersion:2,currentScoringResultsVersion:5,currentScoringBaselineVersion:2};
    expect(isCurrentRun({basedOnResultsVersion:5,basedOnBaselineVersion:2},p)).toBe(true);
    expect(isCurrentRun({basedOnResultsVersion:5,basedOnBaselineVersion:1},p)).toBe(false);
    expect(hasCurrentScoring({...p,baselineVersion:3})).toBe(false);
  });
  it.each([{thresholds:{}},{thresholds:[null]},{subjectGoals:[null]},{subjectGoals:{}}])("returns a contract error for corrupted frozen metadata %j",patch=>{
    expect(historicalContractError({...historicalFrozen(),...patch})).toBe("HISTORICAL_CONTRACT_INVALID");
  });
  it("refuses a legacy percentage target with lost reference metadata instead of treating it as a direct USD goal",()=>{
    const f=historicalFrozen();delete f.periodScope;delete f.comparisonMode;delete f.targetKind;
    expect(historicalContractError(f)).toBe("HISTORICAL_CONTRACT_INVALID");
  });
});

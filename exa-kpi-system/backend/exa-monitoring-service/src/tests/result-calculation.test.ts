import { describe, expect, it } from "vitest";
import { calculateDivision } from "../services/result-calculation.js";
import { evaluateCheck } from "../services/check-results-evaluation.js";
import { checkInputs, checkCards } from "./fixtures/check-results.js";

describe("Ordered result division", () => {
  it.each([["1400000","1000000","1.4"],["1000000","1400000","0.714286"],["50000","2000","25"],["350000","100","3500"],["0","2","0"]])("divides %s by %s", (numerator,denominator,expected) => {
    expect(calculateDivision({numerator,denominator}).value?.toString()).toBe(expected);
  });
  it("keeps missing components pending and never divides by zero", () => {
    expect(calculateDivision({numerator:null,denominator:"2"})).toEqual({value:null,errorCode:"RESULT_INPUT_MISSING"});
    expect(calculateDivision({numerator:"2",denominator:null})).toEqual({value:null,errorCode:"RESULT_INPUT_MISSING"});
    expect(calculateDivision({numerator:"2",denominator:"0"})).toEqual({value:null,errorCode:"RESULT_DENOMINATOR_ZERO"});
    expect(calculateDivision({numerator:"99999999999999",denominator:"0.000001"})).toEqual({value:null,errorCode:"RESULT_PRECISION_EXCEEDED"});
  });
  it("scores the computed official result and reports zero denominators distinctly", () => {
    const inputs:any[]=checkInputs();
    inputs[0].effectiveSettingsSnapshot.resultMethod="CALCULATED_FROM_INPUTS";
    inputs[0].effectiveSettingsSnapshot.calculationTemplate="DIVIDE";
    inputs[0].effectiveSettingsSnapshot.measurementInputs=[{name:"Cost",unit:"USD"},{name:"Count",unit:"unit"}];
    inputs[0].result={...inputs[0].result,resultValue:"999",inputValues:{numerator:"160000",denominator:"2"}};
    const scored=evaluateCheck(inputs,checkCards(),"MANUAL").evaluations[0]!;
    expect(scored).toMatchObject({resultValue:"80000",compliancePercent:"100.000000",status:"CALCULATED"});
    inputs[0].result.inputValues.denominator="0";
    expect(evaluateCheck(inputs,checkCards(),"MANUAL").evaluations[0]).toMatchObject({status:"NOT_CALCULABLE",errorCode:"RESULT_DENOMINATOR_ZERO",resultValue:null,compliancePercent:null,trafficLight:null});
  });
});

import { describe, expect, it } from "vitest";
import {
  ANALYSIS_STATUSES, CALCULATION_PATTERNS, COMPARISON_MODES, KPI_BEHAVIORS, KPI_FAMILIES,
  RESULT_SEMANTICS, detectDefinitionSignals, normalizeDefinitionText,
} from "../definition-assist/index.js";
import { ambiguousDefinitionFixtures, trustedDefinitionFixtures } from "./fixtures/definition-assist.fixtures.js";

describe("Definition Assist backend foundation", () => {
  it("normalizes deterministically without modifying the original user text", () => {
    const original = "  Aumentar Ventás — EXA Parts (Interno + Externo)  ";
    const first = detectDefinitionSignals(original);
    const second = detectDefinitionSignals(original);
    expect(first.originalText).toBe(original);
    expect(first.normalizedText).toBe("aumentar ventas - exa parts interno + externo");
    expect(second).toEqual(first);
    expect(normalizeDefinitionText("Costo / KM")).toBe("costo/km");
  });

  it("exposes the canonical v5 vocabulary without obsolete comparison values", () => {
    expect(KPI_FAMILIES).toContain("SALES");
    expect(KPI_BEHAVIORS).toContain("ZERO_IS_BETTER");
    expect(RESULT_SEMANTICS).toContain("CHANGE_PERCENT");
    expect(CALCULATION_PATTERNS).toEqual(["DIRECT", "DERIVED", "MULTI_INPUT_CURRENT_PERIOD", "COMPOSITE"]);
    expect(CALCULATION_PATTERNS).not.toContain("COMPARISON");
    expect(COMPARISON_MODES).toEqual(["NONE", "PREVIOUS_PERIOD", "SAME_PERIOD_PREVIOUS_YEAR", "CUSTOM_PERIOD"]);
    expect(COMPARISON_MODES).not.toContain("CURRENT_PERIOD");
    expect(ANALYSIS_STATUSES).toEqual(["GOOD", "NEEDS_DETAIL", "NEEDS_CONFIRMATION"]);
  });

  it.each(trustedDefinitionFixtures)("detects trusted generalized signals for $name", ({ name, expected }) => {
    const result = detectDefinitionSignals(name);
    expect(result.family.value).toBe(expected.family);
    if (expected.calculationPattern) expect(result.calculationPattern.value).toBe(expected.calculationPattern);
    if (expected.behavior) expect(result.behavior.value).toBe(expected.behavior);
    if (expected.resultSemantics) expect(result.resultSemantics.value).toBe(expected.resultSemantics);
    if (expected.cadence) expect(result.cadenceHint.value).toBe(expected.cadence);
    if (expected.comparisonDetected !== undefined) expect(result.comparisonDetected).toBe(expected.comparisonDetected);
    if (expected.comparisonMode) expect(result.comparisonMode.value).toBe(expected.comparisonMode);
  });

  it("detects comparison direction independently from business behavior", () => {
    const result = detectDefinitionSignals("Reducir costo por km 5% respecto al período anterior");
    expect(result.behavior.value).toBe("LOWER_IS_BETTER");
    expect(result.comparisonDirection.value).toBe("REDUCTION");
  });

  it.each(ambiguousDefinitionFixtures)("keeps edge case ambiguous: $name", ({ name, ambiguity }) => {
    const result = detectDefinitionSignals(name);
    expect(result.status).toBe("NEEDS_CONFIRMATION");
    expect(result.ambiguities.map(({ code }) => code)).toContain(ambiguity);
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it("does not force Behavior or Result Semantics for an ambiguous reduction", () => {
    const result = detectDefinitionSignals("Reducir gasto administrativo 10%");
    expect(result.behavior).toMatchObject({ value: null, confidence: "LOW" });
    expect(result.resultSemantics).toMatchObject({ value: null, confidence: "LOW" });
    expect(result.comparisonIntent).toBe("POSSIBLE");
    expect(result.comparisonMode.value).toBeNull();
    expect(result.missingConcepts).toEqual(expect.arrayContaining(["RESULT_MEANING", "COMPARISON_MODE"]));
  });

  it("enforces maintain and range non-rules", () => {
    expect(detectDefinitionSignals("Mantener costo/km").behavior.value).not.toBe("EQUAL_IS_BETTER");
    expect(detectDefinitionSignals("Aumentar kms clientes (Rango 110-90)").behavior.value).not.toBe("RANGE");
  });

  it("does not turn an explicit comparison into a Calculation Pattern", () => {
    const result = detectDefinitionSignals("Aumentar ventas respecto al mismo mes del año pasado");
    expect(result.calculationPattern.value).toBe("DIRECT");
    expect(result.comparisonMode.value).toBe("SAME_PERIOD_PREVIOUS_YEAR");
  });
});

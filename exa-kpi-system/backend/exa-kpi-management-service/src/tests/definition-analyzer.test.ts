import { describe, expect, it } from "vitest";
import { analyzeKpiDefinition } from "../definition-assist/index.js";

describe("Definition Analyzer and AutoClassifier", () => {
  it.each([
    ["Vender 10 contenedores por mes", { status: "GOOD", family: "SALES", pattern: "DIRECT", behavior: "GREATER_IS_BETTER", semantics: "COUNT", cadence: "MONTHLY", mode: "NONE" }],
    ["Cero accidentes", { status: "GOOD", family: "INCIDENTS", pattern: "DIRECT", behavior: "ZERO_IS_BETTER", semantics: "COUNT", cadence: null, mode: "NONE" }],
    ["Aumentar ROA", { status: "GOOD", family: "FINANCE", pattern: "DERIVED", behavior: "GREATER_IS_BETTER", semantics: "PERCENTAGE", cadence: null, mode: "NONE" }],
  ] as const)("classifies trusted case %s", (name, expected) => {
    const result = analyzeKpiDefinition(name);
    expect(result).toMatchObject({ analysisStatus: expected.status, resultUnitHint: expect.anything() });
    expect(result.family.value).toBe(expected.family);
    expect(result.calculationPattern.value).toBe(expected.pattern);
    expect(result.behavior.value).toBe(expected.behavior);
    expect(result.resultSemantics.value).toBe(expected.semantics);
    expect(result.cadenceHint).toBe(expected.cadence);
    expect(result.comparison.mode).toBe(expected.mode);
  });

  it("separates direct calculation from an explicit previous-year comparison", () => {
    const result = analyzeKpiDefinition("Aumentar ventas 10% respecto al mismo período del año anterior");
    expect(result).toMatchObject({
      analysisStatus: "GOOD",
      calculationPattern: { value: "DIRECT" },
      family: { value: "SALES" },
      behavior: { value: "GREATER_IS_BETTER" },
      resultSemantics: { value: "ABSOLUTE_VALUE" },
      comparison: { detected: true, intent: "EXPLICIT", mode: "SAME_PERIOD_PREVIOUS_YEAR", direction: "INCREASE" },
      resultUnitHint: "USD",
    });
  });

  it("separates lower business behavior from reduction comparison direction", () => {
    const result = analyzeKpiDefinition("Reducir costo por km 5% respecto al período anterior");
    expect(result).toMatchObject({
      family: { value: "COST" }, resultSemantics: { value: "RATIO" }, behavior: { value: "LOWER_IS_BETTER" },
      comparison: { detected: true, intent: "EXPLICIT", mode: "PREVIOUS_PERIOD", direction: "REDUCTION" },
      resultUnitHint: "USD/KM",
    });
    expect(result.calculationPattern).toMatchObject({ value: null, confidence: "LOW" });
  });

  it("explains ambiguous reduction interpretations without choosing one", () => {
    const result = analyzeKpiDefinition("Reducir gasto administrativo 10%");
    expect(result.analysisStatus).toBe("NEEDS_CONFIRMATION");
    expect(result.behavior).toMatchObject({ value: null, confidence: "LOW" });
    expect(result.resultSemantics).toMatchObject({ value: null, confidence: "LOW" });
    expect(result.resultUnitHint).toBeNull();
    expect(result.targetHint).toMatchObject({ value: 10, unit: "PERCENT", kind: "CHANGE_TARGET", confidence: "MEDIUM" });
    expect(result.comparison).toMatchObject({ intent: "POSSIBLE", mode: null, direction: "REDUCTION" });
    const ambiguity = result.ambiguities.find(({ code }) => code === "RESULT_REPORTING_MEANING");
    expect(ambiguity?.possibleInterpretations).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CURRENT_INDICATOR_VALUE", behavior: "LOWER_IS_BETTER" }),
      expect.objectContaining({ code: "IMPROVEMENT_OR_REDUCTION_ACHIEVED", behavior: "GREATER_IS_BETTER", resultSemantics: "CHANGE_PERCENT" }),
    ]));
    expect(result.suggestedQuestions).toEqual(expect.arrayContaining([expect.objectContaining({ code: "HOW_RESULT_IS_REPORTED" }), expect.objectContaining({ code: "WHAT_COMPARISON_REFERENCE" })]));
  });

  it("extracts target hints without treating them as persisted Goals", () => {
    expect(analyzeKpiDefinition("Vender 10 contenedores por mes").targetHint).toMatchObject({ value: 10, unit: "CONTAINERS", kind: "ABSOLUTE_TARGET", confidence: "HIGH" });
    expect(analyzeKpiDefinition("Reducir gasto administrativo 10%").targetHint).toMatchObject({ value: 10, unit: "PERCENT", kind: "CHANGE_TARGET", confidence: "MEDIUM" });
    expect(analyzeKpiDefinition("Aumentar kms").targetHint).toBeNull();
  });

  it("distinguishes absolute percentage from percentage change targets", () => {
    expect(analyzeKpiDefinition("Margen operativo 15%").targetHint).toMatchObject({ value: 15, unit: "PERCENT", kind: "ABSOLUTE_TARGET", confidence: "HIGH" });
    expect(analyzeKpiDefinition("Aumentar margen operativo 15% vs 2022").targetHint).toMatchObject({ value: 15, unit: "PERCENT", kind: "CHANGE_TARGET", confidence: "HIGH" });
  });

  it.each([
    ["No exceder 5 equipos en desuso", { value: 5, unit: "EQUIPMENT", kind: "UPPER_LIMIT" }],
    ["Máximo 3 incidentes", { value: 3, unit: "INCIDENTS", kind: "UPPER_LIMIT" }],
    ["No superar 48 horas", { value: 48, unit: "HOURS", kind: "UPPER_LIMIT" }],
    ["Lograr al menos 95% de cumplimiento", { value: 95, unit: "PERCENT", kind: "LOWER_LIMIT" }],
    ["Mínimo 90 clientes activos", { value: 90, unit: "CLIENTS", kind: "LOWER_LIMIT" }],
    ["Cierre contable a más tardar el día 6", { value: 6, unit: "DAY_OF_MONTH", kind: "DEADLINE" }],
  ] as const)("detects scalar target semantics for %s", (name, expected) => {
    const target = analyzeKpiDefinition(name).targetHint;
    expect(target).toMatchObject({ ...expected, confidence: "HIGH", evidence: expect.arrayContaining([expect.any(String)]) });
  });

  it("detects an explicit range only with sufficient metric evidence", () => {
    const result = analyzeKpiDefinition("Mantener temperatura entre 2 y 8 °C");
    expect(result.targetHint).toMatchObject({ minValue: 2, maxValue: 8, unit: "CELSIUS", kind: "RANGE_TARGET", confidence: "HIGH", evidence: expect.arrayContaining([expect.any(String)]) });
    expect(result.behavior).toMatchObject({ value: "RANGE", confidence: "HIGH" });
    expect(result.analysisStatus).toBe("GOOD");
  });

  it("does not convert an unexplained numeric range into a target", () => {
    const result = analyzeKpiDefinition("Aumentar kms clientes (Rango 110-90)");
    expect(result.targetHint).toBeNull();
    expect(result.behavior.value).not.toBe("RANGE");
    expect(result.analysisStatus).toBe("NEEDS_CONFIRMATION");
  });

  it("keeps target kind independent from Result semantics and comparison", () => {
    const result = analyzeKpiDefinition("Aumentar ventas 10% respecto al mismo período del año anterior");
    expect(result.targetHint).toMatchObject({ value: 10, unit: "PERCENT", kind: "CHANGE_TARGET", confidence: "HIGH" });
    expect(result.resultSemantics.value).toBe("ABSOLUTE_VALUE");
    expect(result.resultUnitHint).toBe("USD");
    expect(result.comparison).toMatchObject({ intent: "EXPLICIT", mode: "SAME_PERIOD_PREVIOUS_YEAR", direction: "INCREASE" });
  });

  it("keeps ratio semantics independent from Calculation Pattern", () => {
    const result = analyzeKpiDefinition("Costo por km");
    expect(result).toMatchObject({
      family: { value: "COST" }, resultSemantics: { value: "RATIO" }, behavior: { value: "LOWER_IS_BETTER" },
      calculationPattern: { value: null, confidence: "LOW" },
    });
    expect(result.missingConfigurationConcepts).toContain("CALCULATION_PATTERN");
  });

  it("proposes DERIVED only for an accepted formula family", () => {
    expect(analyzeKpiDefinition("ROA")).toMatchObject({ family: { value: "FINANCE" }, resultSemantics: { value: "PERCENTAGE" }, calculationPattern: { value: "DERIVED" } });
  });

  it("separates clear Definition understanding from incomplete Configuration", () => {
    const result = analyzeKpiDefinition("Aumentar ventas");
    expect(result.analysisStatus).toBe("GOOD");
    expect(result.configurationReadiness).toBe("INCOMPLETE");
    expect(result.missingConfigurationConcepts).toEqual(expect.arrayContaining(["GOAL", "CADENCE"]));
  });

  it("keeps an unreferenced percentage comparison unresolved", () => {
    const result = analyzeKpiDefinition("Aumentar ventas 10%");
    expect(result.analysisStatus).toBe("NEEDS_CONFIRMATION");
    expect(result.comparison).toMatchObject({ detected: false, intent: "POSSIBLE", mode: null, direction: "INCREASE" });
    expect(result.missingConcepts).toContain("COMPARISON_MODE");
  });

  it.each([
    ["Vender 10 contenedores", "NONE", false, "NONE"],
    ["Aumentar ventas 10%", "POSSIBLE", false, null],
    ["Aumentar ventas 10% respecto al período anterior", "EXPLICIT", true, "PREVIOUS_PERIOD"],
  ] as const)("formalizes comparison intent for %s", (name, intent, detected, mode) => {
    expect(analyzeKpiDefinition(name).comparison).toMatchObject({ intent, detected, mode });
  });

  it("guarantees actionable confirmation metadata", () => {
    const result = analyzeKpiDefinition("Reducir gasto administrativo 10%");
    expect(result.analysisStatus).toBe("NEEDS_CONFIRMATION");
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
    result.ambiguities.forEach((ambiguity) => expect(ambiguity).toMatchObject({
      code: expect.any(String), explanation: expect.any(String), evidence: expect.any(Array), pendingDecision: expect.any(String),
    }));
  });

  it("includes a deterministic ephemeral rule version", () => {
    expect(analyzeKpiDefinition("Cero accidentes").ruleVersion).toBe("DEFINITION_ASSIST_V1");
  });

  it("enforces maintain and range non-rules", () => {
    const maintain = analyzeKpiDefinition("Mantener costo/km");
    const range = analyzeKpiDefinition("Aumentar kms clientes (Rango 110-90)");
    expect(maintain).toMatchObject({ analysisStatus: "NEEDS_CONFIRMATION", behavior: { value: null } });
    expect(maintain.ambiguities).toContainEqual(expect.objectContaining({ code: "MAINTAIN_MEANING" }));
    expect(range).toMatchObject({ analysisStatus: "NEEDS_CONFIRMATION", behavior: { value: null } });
    expect(range.ambiguities).toContainEqual(expect.objectContaining({ code: "RANGE_MEANING" }));
  });

  it("returns confidence and evidence for proposals", () => {
    const result = analyzeKpiDefinition("Cero accidentes");
    expect(result.family).toMatchObject({ confidence: "HIGH", evidence: expect.arrayContaining([expect.any(String)]) });
    expect(result.behavior).toMatchObject({ confidence: "HIGH", evidence: expect.arrayContaining([expect.any(String)]) });
  });

  it("returns NEEDS_DETAIL for unknown generic wording", () => {
    const result = analyzeKpiDefinition("Mejorar rendimiento");
    expect(result).toMatchObject({ analysisStatus: "NEEDS_DETAIL", family: { value: "UNKNOWN", confidence: "LOW" } });
  });

  it("is deterministic, punctuation tolerant, and does not mutate input", () => {
    const input = { name: "  CÉRO accidentes!!!  " };
    const snapshot = { ...input };
    const first = analyzeKpiDefinition(input.name);
    const second = analyzeKpiDefinition(input.name);
    expect(second).toEqual(first);
    expect(first.normalizedName).toBe("cero accidentes");
    expect(input).toEqual(snapshot);
  });
});

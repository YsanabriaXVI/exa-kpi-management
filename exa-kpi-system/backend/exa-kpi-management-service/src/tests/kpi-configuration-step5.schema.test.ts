import { describe, expect, it } from "vitest";
import { kpiConfigurationBodySchema } from "../schemas/kpi-configuration.schema.js";

const base = { definitionId: "1", goal: 10, measurementUnit: "USD", dataSource: "Manual Entry", ranges: { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 }, isActive: true };

describe("KPI Configuration Step 5 contract", () => {
  it("defaults a legacy request to current-period single goal", () => {
    const value = kpiConfigurationBodySchema.parse(base);
    expect(value).toMatchObject({ periodScope: "CURRENT_PERIOD", goalMode: "SINGLE", evaluationScope: "OVERALL", goalType: "SINGLE_VALUE", resultMethod: "DIRECT", inputFrequencyCode: "MONTHLY" });
  });

  it("keeps target and official Result units independent for historical growth", () => {
    const value = kpiConfigurationBodySchema.parse({ ...base, periodScope: "SAME_PERIOD_PREVIOUS_YEAR", targetKind: "CHANGE_TARGET", goal: 10, goalUnit: "%", measurementUnit: "USD" });
    expect(value).toMatchObject({ goalUnit: "%", measurementUnit: "USD", resultMethod: "DIRECT" });
  });

  it("rejects % as the actual Result Unit for a historical percentage-change target", () => {
    expect(() => kpiConfigurationBodySchema.parse({ ...base, periodScope: "PREVIOUS_PERIOD", targetKind: "CHANGE_TARGET", goalUnit: "%", measurementUnit: "%" })).toThrow(/actual measured Result/i);
    expect(kpiConfigurationBodySchema.parse({ ...base, periodScope: "CURRENT_PERIOD", targetKind: "ABSOLUTE_TARGET", goalUnit: "%", measurementUnit: "%" }).measurementUnit).toBe("%");
  });

  it("accepts calculated official Results with typed Measurement Inputs", () => {
    const value = kpiConfigurationBodySchema.parse({ ...base, measurementUnit: "%", goalUnit: "%", resultMethod: "CALCULATED_FROM_INPUTS", calculationPattern: "DERIVED", calculationTemplate: "PERCENT_RATIO", measurementInputs: [{ name: "Completed Features", unit: "units" }, { name: "Pending Features", unit: "units" }] });
    expect(value.measurementInputs).toHaveLength(2);
  });

  it("keeps By Subject independent from Goal Type and requires assignment", () => {
    const value = kpiConfigurationBodySchema.parse({ ...base, evaluationScope: "BY_SUBJECT", goalMode: "BY_SUBJECT", goalType: "SINGLE_VALUE", goalAssignment: "SAME_GOAL_FOR_ALL", subjectType: "COMPANY", subjects: [{ subjectExternalId: "9", subjectLabel: "EXA" }] });
    expect(value).toMatchObject({ evaluationScope: "BY_SUBJECT", goalType: "SINGLE_VALUE", goalAssignment: "SAME_GOAL_FOR_ALL" });
  });

  it("accepts a historical change target while preserving the Result unit", () => {
    const value = kpiConfigurationBodySchema.parse({ ...base, periodScope: "SAME_PERIOD_PREVIOUS_YEAR", targetKind: "CHANGE_TARGET", goal: 10 });
    expect(value.measurementUnit).toBe("USD");
  });

  it("rejects a change target without a comparison reference", () => {
    expect(() => kpiConfigurationBodySchema.parse({ ...base, targetKind: "CHANGE_TARGET" })).toThrow(/percentage change/i);
  });

  it("rejects Range and persists explicit per-subject Goals", () => {
    expect(() => kpiConfigurationBodySchema.parse({ ...base, goalMode: "RANGE" })).toThrow();
    const subject = { subjectExternalId: "9", subjectCode: "EXA", subjectLabel: "EXA" };
    const value = kpiConfigurationBodySchema.parse({ ...base, goalMode: "BY_SUBJECT", evaluationScope: "BY_SUBJECT", goalAssignment: "DIFFERENT_GOAL_PER_SUBJECT", subjectType: "COMPANY", subjects: [subject], subjectGoals: [{ ...subject, goal: 500000 }] });
    expect(value.subjectGoals[0]).toMatchObject({ subjectExternalId: "9", goal: 500000 });
  });

  it("requires a deterministic template for calculated Results", () => {
    expect(() => kpiConfigurationBodySchema.parse({ ...base, resultMethod: "CALCULATED_FROM_INPUTS", calculationPattern: "DERIVED", measurementInputs: [{ name: "A", unit: "units" }, { name: "B", unit: "units" }] })).toThrow(/Calculation Template/i);
  });

  it("accepts negative, zero, and decimal Goal values", () => {
    expect(kpiConfigurationBodySchema.parse({ ...base, goal: -12.75 }).goal).toBe(-12.75);
    expect(kpiConfigurationBodySchema.parse({ ...base, goal: 0 }).goal).toBe(0);
    const subject = { subjectExternalId: "9", subjectCode: "EXA", subjectLabel: "EXA" };
    const bySubject = kpiConfigurationBodySchema.parse({ ...base, goalMode: "BY_SUBJECT", evaluationScope: "BY_SUBJECT", goalAssignment: "DIFFERENT_GOAL_PER_SUBJECT", subjectType: "COMPANY", subjects: [subject], subjectGoals: [{ ...subject, goal: -0.5 }] });
    expect(bySubject.subjectGoals[0]!.goal).toBe(-0.5);
  });
});

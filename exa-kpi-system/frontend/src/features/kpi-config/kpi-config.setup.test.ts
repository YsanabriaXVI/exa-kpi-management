import { describe, expect, it } from "vitest";
import {
  applyDefaultGoal,
  comparisonModeForPeriodScope,
  goalPresentationForPeriodScope,
  normalizeMeasurementUnitOptions,
  previousPeriodStart,
  resolvedPoolPeriodWorkflowStatus,
  selectedGlobalEffectiveFrom,
  supportsRangeGoal,
  requiresQuantitativeResultUnit,
  validateRange,
} from "./kpi-config.setup";

describe("Set KPI Config setup contract", () => {
  it("maps UI Period Scope without reintroducing CURRENT_PERIOD as a comparison mode", () => {
    expect(comparisonModeForPeriodScope("CURRENT_PERIOD")).toBe("NONE");
    expect(comparisonModeForPeriodScope("SAME_PERIOD_PREVIOUS_YEAR")).toBe(
      "SAME_PERIOD_PREVIOUS_YEAR",
    );
    expect(comparisonModeForPeriodScope("PREVIOUS_PERIOD")).toBe(
      "PREVIOUS_PERIOD",
    );
  });

  it("resolves the previous period across year boundaries at contract level", () => {
    expect(previousPeriodStart("2027-01-01", 1)).toBe("2026-12-01");
    expect(previousPeriodStart("2027-01-01", 3)).toBe("2026-10-01");
  });

  it("uses the earliest selected eligible Pool period for a global revision", () => {
    const periods = [
      {
        selectionKey: "1:2026-09",
        start: "2026-09-01",
        workflowStatus: "EDITABLE" as const,
      },
      {
        selectionKey: "1:2026-10",
        start: "2026-10-01",
        workflowStatus: "FUTURE" as const,
      },
      {
        selectionKey: "2:2026-11",
        start: "2026-11-01",
        workflowStatus: "FINALIZED" as const,
      },
      {
        selectionKey: "2:2026-12",
        start: "2026-12-01",
        workflowStatus: "FUTURE" as const,
      },
    ];
    expect(
      selectedGlobalEffectiveFrom(
        periods,
        new Set(["1:2026-09", "1:2026-10", "2:2026-12"]),
        "2026-09-04",
      ),
    ).toBe("2026-09-01");
    expect(
      selectedGlobalEffectiveFrom(
        periods,
        new Set(["2:2026-11"]),
        "2026-09-04",
      ),
    ).toBeUndefined();
  });

  it("keeps future Pool periods eligible instead of presenting them as finalized", () => {
    expect(resolvedPoolPeriodWorkflowStatus("FUTURE", "FUTURE", "FUTURE")).toBe(
      "FUTURE",
    );
    expect(
      resolvedPoolPeriodWorkflowStatus(
        "EDITABLE",
        "EDITABLE",
        "FINALIZED_SCORECARD",
      ),
    ).toBe("FINALIZED");
    expect(
      resolvedPoolPeriodWorkflowStatus("EDITABLE", "CLOSED", "CLOSED"),
    ).toBe("CLOSED");
  });

  it("validates an explicit Range", () => {
    expect(validateRange("90", "110")).toBe(true);
    expect(validateRange("110", "90")).toBe(false);
    expect(validateRange("", "110")).toBe(false);
  });

  it("derives Goal UX from Period Scope and blocks historical Range in V1", () => {
    expect(goalPresentationForPeriodScope("CURRENT_PERIOD")).toEqual({
      label: "Goal",
      targetKind: "ABSOLUTE_TARGET",
      suffix: "",
    });
    expect(goalPresentationForPeriodScope("PREVIOUS_PERIOD")).toEqual({
      label: "Target Change",
      targetKind: "CHANGE_TARGET",
      suffix: "%",
    });
    expect(supportsRangeGoal("CURRENT_PERIOD")).toBe(true);
    expect(supportsRangeGoal("SAME_PERIOD_PREVIOUS_YEAR")).toBe(false);
  });

  it("requires a quantitative Result Unit only for historical percentage-change targets", () => {
    expect(
      requiresQuantitativeResultUnit("PREVIOUS_PERIOD", "CHANGE_TARGET", "%"),
    ).toBe(true);
    expect(
      requiresQuantitativeResultUnit(
        "SAME_PERIOD_PREVIOUS_YEAR",
        "CHANGE_TARGET",
        "%",
      ),
    ).toBe(true);
    expect(
      requiresQuantitativeResultUnit("CURRENT_PERIOD", "ABSOLUTE_TARGET", "%"),
    ).toBe(false);
    expect(
      requiresQuantitativeResultUnit("PREVIOUS_PERIOD", "CHANGE_TARGET", "USD"),
    ).toBe(false);
  });

  it("preserves subject overrides when a default changes", () => {
    const subjects = [
      { subjectExternalId: "1", subjectLabel: "EXA", goal: 3500 },
      { subjectExternalId: "2", subjectLabel: "CONMOXA", goal: 4500 },
    ];
    expect(
      applyDefaultGoal(subjects, 3700, 3500, false).map((item) => item.goal),
    ).toEqual([3700, 4500]);
    expect(
      applyDefaultGoal(subjects, 3700, 3500, true).map((item) => item.goal),
    ).toEqual([3700, 3700]);
  });

  it("normalizes measurement-unit labels and legacy aliases", () => {
    const units = normalizeMeasurementUnitOptions([
      { id: "1", code: "USD", name: "USD", symbol: "USD", isPercentage: false },
      {
        id: "2",
        code: "KM",
        name: "Kilometers",
        symbol: "km",
        isPercentage: false,
      },
      { id: "3", code: "KMS", name: "kms", symbol: "kms", isPercentage: false },
      { id: "4", code: "PERCENT", name: "%", symbol: "%", isPercentage: true },
    ]);
    expect(units.map((unit) => unit.label)).toEqual([
      "USD",
      "km — Kilometers",
      "%",
    ]);
  });
});

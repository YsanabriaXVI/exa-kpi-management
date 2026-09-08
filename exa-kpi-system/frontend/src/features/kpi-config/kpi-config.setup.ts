import type { PeriodScope, SubjectGoal } from "./kpi-config.types";

export type PoolPeriodWorkflowStatus =
  "EDITABLE" | "FINALIZED" | "FUTURE" | "CLOSED";

export function resolvedPoolPeriodWorkflowStatus(
  currentStatus: PoolPeriodWorkflowStatus,
  effectiveStatus?: "EDITABLE" | "FINALIZED" | "FUTURE" | "CLOSED" | "INACTIVE",
  frozenReason?: string | null,
): PoolPeriodWorkflowStatus {
  if (effectiveStatus === "CLOSED" || effectiveStatus === "INACTIVE")
    return "CLOSED";
  if (effectiveStatus === "FINALIZED" || frozenReason === "FINALIZED_SCORECARD")
    return "FINALIZED";
  if (effectiveStatus === "FUTURE") return "FUTURE";
  if (effectiveStatus === "EDITABLE") return "EDITABLE";
  return currentStatus;
}

export function comparisonModeForPeriodScope(scope: PeriodScope) {
  return scope === "CURRENT_PERIOD" ? ("NONE" as const) : scope;
}

export function goalPresentationForPeriodScope(scope: PeriodScope) {
  return scope === "CURRENT_PERIOD"
    ? { label: "Goal", targetKind: "ABSOLUTE_TARGET" as const, suffix: "" }
    : {
        label: "Target Change",
        targetKind: "CHANGE_TARGET" as const,
        suffix: "%",
      };
}

export function supportsRangeGoal(scope: PeriodScope) {
  return scope === "CURRENT_PERIOD";
}

export function requiresQuantitativeResultUnit(
  scope: PeriodScope,
  targetKind: string | null,
  goalUnit: string,
) {
  return (
    scope !== "CURRENT_PERIOD" &&
    targetKind === "CHANGE_TARGET" &&
    goalUnit.trim() === "%"
  );
}

export function selectedGlobalEffectiveFrom(
  periods: Array<{
    selectionKey: string;
    start: string;
    workflowStatus: "EDITABLE" | "FINALIZED" | "FUTURE" | "CLOSED";
  }>,
  selectedKeys: Set<string>,
  _today: string,
) {
  return periods
    .filter(
      (period) =>
        (period.workflowStatus === "EDITABLE" ||
          period.workflowStatus === "FUTURE") &&
        selectedKeys.has(period.selectionKey),
    )
    .map((period) => period.start)
    .sort()[0];
}

export function previousPeriodStart(
  periodStart: string,
  monthsPerPeriod: number,
) {
  const [year, month] = periodStart.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 - monthsPerPeriod, 1));
  return date.toISOString().slice(0, 10);
}

export function validateRange(minimum: string, maximum: string) {
  return (
    minimum !== "" &&
    maximum !== "" &&
    Number.isFinite(Number(minimum)) &&
    Number.isFinite(Number(maximum)) &&
    Number(minimum) <= Number(maximum)
  );
}

export function applyDefaultGoal(
  subjects: SubjectGoal[],
  nextDefault: number,
  previousDefault: number | null,
  applyToAll: boolean,
) {
  return subjects.map((subject) =>
    applyToAll || subject.goal === 0 || subject.goal === previousDefault
      ? { ...subject, goal: nextDefault }
      : subject,
  );
}

type MeasurementUnitOption = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isPercentage: boolean;
};

export function normalizeMeasurementUnitOptions(
  units: MeasurementUnitOption[],
) {
  const aliases: Record<string, string> = {
    kms: "km",
    kilometer: "km",
    kilometers: "km",
  };
  const canonical = (symbol: string) =>
    aliases[symbol.trim().toLowerCase()] ?? symbol.trim().toLowerCase();
  const preferred = [...units].sort(
    (left, right) =>
      Number(left.symbol.trim().toLowerCase() !== canonical(left.symbol)) -
      Number(right.symbol.trim().toLowerCase() !== canonical(right.symbol)),
  );
  const unique = new Map<string, MeasurementUnitOption>();
  preferred.forEach((unit) => {
    if (!unique.has(canonical(unit.symbol)))
      unique.set(canonical(unit.symbol), unit);
  });
  return [...unique.values()].map((unit) => ({
    ...unit,
    label:
      unit.name.trim().toLowerCase() === unit.symbol.trim().toLowerCase()
        ? unit.symbol
        : `${unit.symbol} · ${unit.name}`,
  }));
}

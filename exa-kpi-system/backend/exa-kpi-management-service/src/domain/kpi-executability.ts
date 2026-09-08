import { validResultBands } from "../contracts/result-bands.js";
import { historicalContractError } from "../contracts/historical-contract.js";

export const KPI_EXECUTION_CAPABILITY_VERSION = "KPI_EXECUTION_V1" as const;

export type KpiExecutabilityReasonCode =
  | "KPI_CONFIGURATION_INACTIVE"
  | "SCORING_RULE_INVALID"
  | "TARGET_KIND_REQUIRED"
  | "UNSUPPORTED_SCORING_COMBINATION"
  | "GOAL_SCOPE_REQUIRED"
  | "EVALUATION_REFERENCE_REQUIRED"
  | "GOAL_MEASUREMENT_UNIT_REQUIRED"
  | "OFFICIAL_RESULT_UNIT_REQUIRED"
  | "DATA_SOURCE_REQUIRED"
  | "FREQUENCY_REQUIRED"
  | "BEHAVIOR_REQUIRED"
  | "RESULT_SEMANTICS_REQUIRED"
  | "SCORING_CONFIGURATION_NOT_APPROVED"
  | "SCORING_METHOD_REQUIRED"
  | "TRAFFIC_LIGHT_STRUCTURE_INVALID"
  | "GOAL_REQUIRED"
  | "SUBJECT_TYPE_REQUIRED"
  | "SUBJECTS_REQUIRED"
  | "SUBJECT_ID_REQUIRED"
  | "DUPLICATE_SUBJECT_ID"
  | "SUBJECT_GOAL_REQUIRED"
  | "HISTORICAL_CONTRACT_INVALID"
  | "GROUP_GOAL_RUNTIME_UNDEFINED"
  | "RESULT_METHOD_RUNTIME_NOT_SUPPORTED"
  | "LEGACY_RANGE_RUNTIME_NOT_SUPPORTED";

export type KpiExecutability = {
  capabilityVersion: typeof KPI_EXECUTION_CAPABILITY_VERSION;
  status: "EXECUTABLE" | "BLOCKED";
  executable: boolean;
  reasons: Array<{ code: KpiExecutabilityReasonCode; message: string }>;
};

export type ExecutabilityInput = {
  comparisonDirection?: string | null; targetKind?: string | null; scoringRuleConfig?: unknown; monthsPerPeriod?: number;
  active: boolean;
  evaluationScope: string | null;
  periodScope: string | null;
  goal: string | null;
  goalMode: string | null;
  goalUnit?: { id?: string | bigint; code?: string; symbol?: string } | null;
  measurementUnit?: { id?: string | bigint; code?: string; symbol?: string } | null;
  dataSource?: { id?: string | bigint; code?: string } | null;
  frequencyCode?: string | null;
  evaluationType?: { id?: string | bigint; code?: string } | null;
  resultSemantics?: string | null;
  scoringMethod?: string | null;
  scoringApprovalStatus?: string | null;
  resultMethod?: string | null;
  calculationTemplate?: string | null;
  measurementInputs?: Array<{name: string; unit: string}>;
  subjectType?: string | null;
  subjects?: Array<{ subjectExternalId?: string | null }>;
  subjectGoals?: Array<{ subjectExternalId?: string | null; goal?: string | null; goalUnit?: ExecutabilityInput["goalUnit"]; resultUnit?: ExecutabilityInput["measurementUnit"] }>;
  groupGoal?: { value?: string | null } | null;
  thresholds?: Array<{ code?: string; rangeMinPercent?: string | null; rangeMaxPercent?: string | null }>;
};

const messages: Record<KpiExecutabilityReasonCode, string> = {
  SCORING_RULE_INVALID: "Complete valid compliance limits or explicit zero-result bands for every evaluation.",
  TARGET_KIND_REQUIRED: "Define the target kind before Monitoring.",
  UNSUPPORTED_SCORING_COMBINATION: "Monitoring supports proportional More/Less scoring or zero-target bands; select a supported evaluation rule.",
  KPI_CONFIGURATION_INACTIVE: "The KPI Configuration is inactive.", GOAL_SCOPE_REQUIRED: "Goal Scope is required.",
  EVALUATION_REFERENCE_REQUIRED: "Evaluation Reference is required.", GOAL_MEASUREMENT_UNIT_REQUIRED: "Goal Measurement Unit is required.",
  OFFICIAL_RESULT_UNIT_REQUIRED: "Official Result Unit is required.", DATA_SOURCE_REQUIRED: "Data Source is required.", FREQUENCY_REQUIRED: "Frequency is required.",
  BEHAVIOR_REQUIRED: "Behavior is required.", RESULT_SEMANTICS_REQUIRED: "Result Semantics is required.",
  SCORING_CONFIGURATION_NOT_APPROVED: "The scoring configuration must be approved.", SCORING_METHOD_REQUIRED: "Scoring Method is required.",
  TRAFFIC_LIGHT_STRUCTURE_INVALID: "Traffic Light must contain valid RED, YELLOW, and GREEN thresholds.", GOAL_REQUIRED: "Goal / Target is required.",
  SUBJECT_TYPE_REQUIRED: "BY_ENTITY requires a Subject Type.", SUBJECTS_REQUIRED: "BY_ENTITY requires at least one entity.",
  SUBJECT_ID_REQUIRED: "Every entity must have a stable external ID.", DUPLICATE_SUBJECT_ID: "Duplicate entity external IDs are not allowed.",
  SUBJECT_GOAL_REQUIRED: "Every selected entity must have a Goal / Target.",
  HISTORICAL_CONTRACT_INVALID: "Historical comparison requires a complete HISTORICAL_COMPARISON_V1 contract.",
  GROUP_GOAL_RUNTIME_UNDEFINED: "Group Goal runtime evaluation has not been defined.",
  RESULT_METHOD_RUNTIME_NOT_SUPPORTED: "The configured Result Method is not supported by runtime V1.",
  LEGACY_RANGE_RUNTIME_NOT_SUPPORTED: "Legacy Range runtime is not supported by runtime V1.",
};

export function evaluateKpiExecutability(input: ExecutabilityInput): KpiExecutability {
  const codes: KpiExecutabilityReasonCode[] = [];
  const add = (condition: boolean, code: KpiExecutabilityReasonCode) => { if (condition && !codes.includes(code)) codes.push(code); };
  add(!input.active, "KPI_CONFIGURATION_INACTIVE");
  add(!input.targetKind, "TARGET_KIND_REQUIRED");
  const behavior = input.evaluationType?.code;
  const rule = input.scoringRuleConfig as { floorPercent?: number; capPercent?: number; bands?: Array<{ minResult?: number; maxResult?: number; compliance?: number }> } | null;
  const goals = input.evaluationScope === "BY_SUBJECT" ? (input.subjectGoals ?? []).map(row => row.goal) : [input.goal];
  const proportional = input.scoringMethod === "PROPORTIONAL" && ["GREATER_IS_BETTER", "HIGHER_IS_BETTER", "LOWER_IS_BETTER"].includes(behavior ?? "");
  const zero = input.scoringMethod === "ZERO_TARGET_BANDS" && ["LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(behavior ?? "");
  const bandsMethod = input.scoringMethod === "RESULT_BANDS" && ["GREATER_IS_BETTER", "HIGHER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(behavior ?? "");
  const binary = input.scoringMethod === "BINARY" && input.resultSemantics === "BINARY" && input.resultMethod === "DIRECT" && input.periodScope === "CURRENT_PERIOD";
  add(bandsMethod && !validResultBands(rule?.bands), "SCORING_RULE_INVALID");
  add(!proportional && !zero && !bandsMethod && !binary, "UNSUPPORTED_SCORING_COMBINATION");
  if (proportional) add(!rule || !Number.isFinite(rule.floorPercent) || !Number.isFinite(rule.capPercent) || rule.floorPercent! < 0 || rule.capPercent! > 100 || rule.floorPercent! > rule.capPercent! || goals.some(goal => goal == null || !Number.isFinite(Number(goal)) || Number(goal) <= 0), "SCORING_RULE_INVALID");
  if (zero) {
    const bands = Array.isArray(rule?.bands) ? [...rule.bands].sort((a, b) => Number(a.minResult) - Number(b.minResult)) : [];
    add(goals.some(goal => goal == null || Number(goal) !== 0) || !bands.length || bands.some((b, i) => !Number.isFinite(b.minResult) || !Number.isFinite(b.compliance) || b.compliance! < 0 || b.compliance! > 100 || b.maxResult !== undefined && (!Number.isFinite(b.maxResult) || b.maxResult < b.minResult!) || i > 0 && (bands[i-1]!.maxResult ?? Infinity) >= b.minResult!) || !bands.some(b => b.minResult! <= 0 && (b.maxResult ?? Infinity) >= 0), "SCORING_RULE_INVALID");
  }
  add(!["OVERALL", "BY_SUBJECT"].includes(input.evaluationScope ?? ""), "GOAL_SCOPE_REQUIRED");
  add(!input.periodScope, "EVALUATION_REFERENCE_REQUIRED");
  add(!!historicalContractError({...input, comparisonMode: input.periodScope, historicalCapabilityVersion: "HISTORICAL_COMPARISON_V1", inputFrequency: {id: "0", code: input.frequencyCode, monthsPerPeriod: input.monthsPerPeriod}}), "HISTORICAL_CONTRACT_INVALID");
  const units = input.evaluationScope === "BY_SUBJECT" ? (input.subjectGoals ?? []).map(row => ({goal: row.goalUnit ?? input.goalUnit, result: row.resultUnit ?? input.measurementUnit})) : [{goal: input.goalUnit, result: input.measurementUnit}];
  add(units.some(u => !u.goal?.id && !u.goal?.code && !u.goal?.symbol), "GOAL_MEASUREMENT_UNIT_REQUIRED");
  add(units.some(u => !u.result?.id && !u.result?.code && !u.result?.symbol), "OFFICIAL_RESULT_UNIT_REQUIRED");
  add(!input.dataSource?.id && !input.dataSource?.code, "DATA_SOURCE_REQUIRED");
  add(!input.frequencyCode, "FREQUENCY_REQUIRED"); add(!input.evaluationType?.code, "BEHAVIOR_REQUIRED");
  add(!input.resultSemantics, "RESULT_SEMANTICS_REQUIRED"); add(!input.scoringMethod, "SCORING_METHOD_REQUIRED");
  add(input.scoringApprovalStatus !== "APPROVED", "SCORING_CONFIGURATION_NOT_APPROVED");
  add(input.resultMethod !== "DIRECT" && !(input.resultMethod === "CALCULATED_FROM_INPUTS" && input.calculationTemplate === "DIVIDE" && input.measurementInputs?.length === 2 && input.measurementInputs.every(i => i.name.trim() && i.unit.trim())), "RESULT_METHOD_RUNTIME_NOT_SUPPORTED"); add(input.goalMode === "RANGE", "LEGACY_RANGE_RUNTIME_NOT_SUPPORTED");
  // Group Goal is informational, without aggregation or weight.
  const levels = new Set((input.thresholds ?? []).filter((item) => item.rangeMinPercent != null && item.rangeMaxPercent != null).map((item) => item.code));
  add(!["RED", "YELLOW", "GREEN"].every((code) => levels.has(code)), "TRAFFIC_LIGHT_STRUCTURE_INVALID");
  if (input.evaluationScope === "OVERALL") add(input.goal == null, "GOAL_REQUIRED");
  if (input.evaluationScope === "BY_SUBJECT") {
    const subjects = input.subjects ?? []; const goals = input.subjectGoals ?? [];
    add(!input.subjectType, "SUBJECT_TYPE_REQUIRED"); add(subjects.length === 0, "SUBJECTS_REQUIRED");
    add(subjects.some((item) => !item.subjectExternalId?.trim()), "SUBJECT_ID_REQUIRED");
    const ids = subjects.map((item) => item.subjectExternalId).filter(Boolean) as string[];
    add(new Set(ids).size !== ids.length, "DUPLICATE_SUBJECT_ID");
    const goalById = new Map(goals.map((item) => [item.subjectExternalId, item.goal]));
    add(ids.some((id) => goalById.get(id) == null), "SUBJECT_GOAL_REQUIRED");
  }
  return { capabilityVersion: KPI_EXECUTION_CAPABILITY_VERSION, executable: codes.length === 0, status: codes.length === 0 ? "EXECUTABLE" : "BLOCKED", reasons: codes.map((code) => ({ code, message: messages[code] })) };
}

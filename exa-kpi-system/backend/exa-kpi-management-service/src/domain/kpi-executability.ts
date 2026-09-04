export const KPI_EXECUTION_CAPABILITY_VERSION = "KPI_EXECUTION_V1" as const;

export type KpiExecutabilityReasonCode =
  | "KPI_CONFIGURATION_INACTIVE"
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
  | "HISTORICAL_COMPARISON_RUNTIME_NOT_SUPPORTED"
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
  subjectType?: string | null;
  subjects?: Array<{ subjectExternalId?: string | null }>;
  subjectGoals?: Array<{ subjectExternalId?: string | null; goal?: string | null }>;
  groupGoal?: { value?: string | null } | null;
  thresholds?: Array<{ code?: string; rangeMinPercent?: string | null; rangeMaxPercent?: string | null }>;
};

const messages: Record<KpiExecutabilityReasonCode, string> = {
  KPI_CONFIGURATION_INACTIVE: "The KPI Configuration is inactive.", GOAL_SCOPE_REQUIRED: "Goal Scope is required.",
  EVALUATION_REFERENCE_REQUIRED: "Evaluation Reference is required.", GOAL_MEASUREMENT_UNIT_REQUIRED: "Goal Measurement Unit is required.",
  OFFICIAL_RESULT_UNIT_REQUIRED: "Official Result Unit is required.", DATA_SOURCE_REQUIRED: "Data Source is required.", FREQUENCY_REQUIRED: "Frequency is required.",
  BEHAVIOR_REQUIRED: "Behavior is required.", RESULT_SEMANTICS_REQUIRED: "Result Semantics is required.",
  SCORING_CONFIGURATION_NOT_APPROVED: "The scoring configuration must be approved.", SCORING_METHOD_REQUIRED: "Scoring Method is required.",
  TRAFFIC_LIGHT_STRUCTURE_INVALID: "Traffic Light must contain valid RED, YELLOW, and GREEN thresholds.", GOAL_REQUIRED: "Goal / Target is required.",
  SUBJECT_TYPE_REQUIRED: "BY_ENTITY requires a Subject Type.", SUBJECTS_REQUIRED: "BY_ENTITY requires at least one entity.",
  SUBJECT_ID_REQUIRED: "Every entity must have a stable external ID.", DUPLICATE_SUBJECT_ID: "Duplicate entity external IDs are not allowed.",
  SUBJECT_GOAL_REQUIRED: "Every selected entity must have a Goal / Target.",
  HISTORICAL_COMPARISON_RUNTIME_NOT_SUPPORTED: "Historical comparison runtime is not implemented yet.",
  GROUP_GOAL_RUNTIME_UNDEFINED: "Group Goal runtime evaluation has not been defined.",
  RESULT_METHOD_RUNTIME_NOT_SUPPORTED: "The configured Result Method is not supported by runtime V1.",
  LEGACY_RANGE_RUNTIME_NOT_SUPPORTED: "Legacy Range runtime is not supported by runtime V1.",
};

export function evaluateKpiExecutability(input: ExecutabilityInput): KpiExecutability {
  const codes: KpiExecutabilityReasonCode[] = [];
  const add = (condition: boolean, code: KpiExecutabilityReasonCode) => { if (condition && !codes.includes(code)) codes.push(code); };
  add(!input.active, "KPI_CONFIGURATION_INACTIVE");
  add(!["OVERALL", "BY_SUBJECT"].includes(input.evaluationScope ?? ""), "GOAL_SCOPE_REQUIRED");
  add(!input.periodScope, "EVALUATION_REFERENCE_REQUIRED");
  add(!!input.periodScope && input.periodScope !== "CURRENT_PERIOD", "HISTORICAL_COMPARISON_RUNTIME_NOT_SUPPORTED");
  add(!input.goalUnit?.id && !input.goalUnit?.code && !input.goalUnit?.symbol, "GOAL_MEASUREMENT_UNIT_REQUIRED");
  add(!input.measurementUnit?.id && !input.measurementUnit?.code && !input.measurementUnit?.symbol, "OFFICIAL_RESULT_UNIT_REQUIRED");
  add(!input.dataSource?.id && !input.dataSource?.code, "DATA_SOURCE_REQUIRED");
  add(!input.frequencyCode, "FREQUENCY_REQUIRED"); add(!input.evaluationType?.code, "BEHAVIOR_REQUIRED");
  add(!input.resultSemantics, "RESULT_SEMANTICS_REQUIRED"); add(!input.scoringMethod, "SCORING_METHOD_REQUIRED");
  add(input.scoringApprovalStatus !== "APPROVED", "SCORING_CONFIGURATION_NOT_APPROVED");
  add(input.resultMethod !== "DIRECT", "RESULT_METHOD_RUNTIME_NOT_SUPPORTED"); add(input.goalMode === "RANGE", "LEGACY_RANGE_RUNTIME_NOT_SUPPORTED");
  add(input.groupGoal != null, "GROUP_GOAL_RUNTIME_UNDEFINED");
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

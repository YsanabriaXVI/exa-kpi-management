export const KPI_FAMILIES = [
  "SALES", "COST", "PRODUCTIVITY", "INCIDENTS", "TIME", "INVENTORY", "UTILIZATION",
  "QUALITY", "COMPLIANCE", "CLIENTS", "MAINTENANCE", "FINANCE", "OTHER", "UNKNOWN",
] as const;

export const KPI_BEHAVIORS = [
  "GREATER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER", "RANGE",
  "EQUAL_IS_BETTER", "BINARY", "MILESTONE",
] as const;

export const RESULT_SEMANTICS = [
  "ABSOLUTE_VALUE", "COUNT", "QUANTITY", "PERCENTAGE", "RATIO", "CHANGE_PERCENT",
] as const;

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export const ANALYSIS_STATUSES = ["GOOD", "NEEDS_DETAIL", "NEEDS_CONFIRMATION"] as const;
export const CALCULATION_PATTERNS = ["DIRECT", "DERIVED", "MULTI_INPUT_CURRENT_PERIOD", "COMPOSITE"] as const;
export const COMPARISON_MODES = ["NONE", "PREVIOUS_PERIOD", "SAME_PERIOD_PREVIOUS_YEAR", "CUSTOM_PERIOD"] as const;
export const COMPARISON_DIRECTIONS = ["INCREASE", "REDUCTION"] as const;
export const COMPARISON_INTENTS = ["NONE", "POSSIBLE", "EXPLICIT"] as const;
export const DEFINITION_ASSIST_RULE_VERSION = "DEFINITION_ASSIST_V1" as const;
export const CONFIGURATION_READINESS_STATES = ["READY", "INCOMPLETE"] as const;
export const TARGET_KINDS = ["ABSOLUTE_TARGET", "CHANGE_TARGET", "UPPER_LIMIT", "LOWER_LIMIT", "RANGE_TARGET", "DEADLINE"] as const;

export type KpiFamily = typeof KPI_FAMILIES[number];
export type KpiBehavior = typeof KPI_BEHAVIORS[number];
export type ResultSemantics = typeof RESULT_SEMANTICS[number];
export type Confidence = typeof CONFIDENCE_LEVELS[number];
export type AnalysisStatus = typeof ANALYSIS_STATUSES[number];
export type CalculationPattern = typeof CALCULATION_PATTERNS[number];
export type ComparisonMode = typeof COMPARISON_MODES[number];
export type ComparisonDirection = typeof COMPARISON_DIRECTIONS[number];
export type ComparisonIntent = typeof COMPARISON_INTENTS[number];
export type ConfigurationReadiness = typeof CONFIGURATION_READINESS_STATES[number];
export type TargetKind = typeof TARGET_KINDS[number];
export type MissingConfigurationConcept = "GOAL" | "CADENCE" | "RESULT_UNIT" | "BEHAVIOR" | "RESULT_SEMANTICS" | "CALCULATION_PATTERN" | "COMPARISON_MODE";

export type Proposal<T> = Readonly<{
  value: T | null;
  confidence: Confidence;
  evidence: readonly string[];
}>;

export type DefinitionAmbiguityCode =
  | "RESULT_REPORTING_MEANING"
  | "COMPARISON_REFERENCE"
  | "RANGE_MEANING"
  | "MAINTAIN_MEANING"
  | "RESULT_UNIT"
  | "CALCULATION_FORMULA"
  | "BUSINESS_SCOPE";

export type MissingConcept =
  | "RESULT_MEANING"
  | "RESULT_UNIT"
  | "COMPARISON_MODE"
  | "CALCULATION_FORMULA"
  | "CADENCE"
  | "BUSINESS_SCOPE";

export type BusinessQuestionCode =
  | "HOW_RESULT_IS_REPORTED"
  | "WHAT_COMPARISON_REFERENCE"
  | "WHAT_RANGE_REPRESENTS"
  | "WHAT_MAINTAIN_MEANS"
  | "WHAT_RESULT_UNIT"
  | "WHAT_CALCULATION_FORMULA"
  | "WHAT_BUSINESS_SCOPE";

export type DefinitionAmbiguity = Readonly<{
  code: DefinitionAmbiguityCode;
  explanation: string;
  evidence: readonly string[];
  pendingDecision: string;
  possibleInterpretations?: readonly Readonly<{
    code: string;
    description: string;
    behavior?: KpiBehavior;
    resultSemantics?: ResultSemantics;
  }>[];
}>;

type TargetHintBase = Readonly<{
  unit: string;
  confidence: Confidence;
  evidence: readonly string[];
}>;

export type ScalarTargetHint = TargetHintBase & Readonly<{
  value: number;
  kind: Exclude<TargetKind, "RANGE_TARGET">;
}>;

export type RangeTargetHint = TargetHintBase & Readonly<{
  minValue: number;
  maxValue: number;
  kind: "RANGE_TARGET";
}>;

export type TargetHint = ScalarTargetHint | RangeTargetHint;

export type SuggestedBusinessQuestion = Readonly<{
  code: BusinessQuestionCode;
  prompt: string;
  options?: readonly Readonly<{ code: string; label: string }>[];
}>;

export type DefinitionSignals = Readonly<{
  originalText: string;
  normalizedText: string;
  family: Proposal<KpiFamily>;
  behavior: Proposal<KpiBehavior>;
  resultSemantics: Proposal<ResultSemantics>;
  calculationPattern: Proposal<CalculationPattern>;
  unitHint: Proposal<string>;
  cadenceHint: Proposal<string>;
  targetHint: TargetHint | null;
  comparisonIntent: ComparisonIntent;
  comparisonDetected: boolean;
  comparisonMode: Proposal<ComparisonMode>;
  comparisonDirection: Proposal<ComparisonDirection>;
  ambiguities: readonly DefinitionAmbiguity[];
  missingConcepts: readonly MissingConcept[];
  suggestedQuestions: readonly SuggestedBusinessQuestion[];
  status: AnalysisStatus;
}>;

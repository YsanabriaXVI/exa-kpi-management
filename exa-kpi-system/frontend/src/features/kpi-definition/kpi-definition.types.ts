export const KPI_DEFINITION_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type KpiDefinitionStatus = (typeof KPI_DEFINITION_STATUSES)[number];
export type KpiDefinitionSortBy = "kpiCode" | "kpiName" | "description" | "category" | "statusCode" | "createdAt" | "updatedAt";
export type SortOrder = "asc" | "desc";

export type KpiCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type KpiDefinition = {
  id: string;
  kpiCode: string;
  kpiName: string;
  description: string;
  status: KpiDefinitionStatus;
  isActive: boolean;
  category: Pick<KpiCategory, "id" | "code" | "name">;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type PaginationMeta = { page: number; pageSize: number; totalItems: number; totalPages: number };
export type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta };

export type KpiDefinitionConfigurationSummary = {
  id: string;
  configCode: string;
  goal: number | null;
  measurementUnit: string | null;
  inputFrequency: string;
  dataSource: string | null;
  status: string;
};
export type KpiDefinitionConfigurationsResponse = PaginatedResponse<KpiDefinitionConfigurationSummary> & {
  meta: PaginationMeta & { configuredItems: number };
};

export type KpiDefinitionListParams = {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string[];
  status?: KpiDefinitionStatus[];
  sortBy: KpiDefinitionSortBy;
  sortOrder: SortOrder;
};

export type CreateKpiDefinitionInput = {
  kpiName: string;
  description: string;
  kpiCategoryId: string;
  isActive?: boolean;
};
export type UpdateKpiDefinitionInput = Partial<Omit<CreateKpiDefinitionInput, "isActive">>;

export type LegacyKpiDefinitionOption = {
  id: string;
  code: string;
  name: string;
  objective: string;
  status: KpiDefinitionStatus;
};

export type SuggestionMatchType = "EXACT_OR_NEAR_DUPLICATE" | "STRONG_SIMILARITY" | "RELATED";
export type KpiDefinitionSuggestion = {
  id: string; code: string; name: string; normalizedName: string;
  similarityScore: number; matchType: SuggestionMatchType;
};
export type KpiDefinitionSuggestionsResponse = {
  query: string; normalizedQuery: string; suggestions: KpiDefinitionSuggestion[];
};

export type AnalysisStatus = "GOOD" | "NEEDS_DETAIL" | "NEEDS_CONFIRMATION";
export type ConfigurationReadiness = "READY" | "INCOMPLETE";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Family = "SALES" | "COST" | "PRODUCTIVITY" | "INCIDENTS" | "TIME" | "INVENTORY" | "UTILIZATION" | "QUALITY" | "COMPLIANCE" | "CLIENTS" | "MAINTENANCE" | "FINANCE" | "OTHER" | "UNKNOWN";
export type Behavior = "GREATER_IS_BETTER" | "LOWER_IS_BETTER" | "ZERO_IS_BETTER" | "RANGE" | "EQUAL_IS_BETTER" | "BINARY" | "MILESTONE";
export type ResultSemantics = "ABSOLUTE_VALUE" | "COUNT" | "QUANTITY" | "PERCENTAGE" | "RATIO" | "CHANGE_PERCENT";
export type CalculationPattern = "DIRECT" | "DERIVED" | "MULTI_INPUT_CURRENT_PERIOD" | "COMPOSITE";
export type ComparisonIntent = "NONE" | "POSSIBLE" | "EXPLICIT";
export type ComparisonMode = "NONE" | "PREVIOUS_PERIOD" | "SAME_PERIOD_PREVIOUS_YEAR" | "CUSTOM_PERIOD";
export type ComparisonDirection = "INCREASE" | "REDUCTION";
export type TargetKind = "ABSOLUTE_TARGET" | "CHANGE_TARGET" | "UPPER_LIMIT" | "LOWER_LIMIT" | "RANGE_TARGET" | "DEADLINE";
export type MissingConfigurationConcept = "GOAL" | "CADENCE" | "RESULT_UNIT" | "BEHAVIOR" | "RESULT_SEMANTICS" | "CALCULATION_PATTERN" | "COMPARISON_MODE";
export type Proposal<T> = { value: T | null; confidence: Confidence; evidence: readonly string[] };
type TargetHintBase = { unit: string; confidence: Confidence; evidence: readonly string[] };
export type ScalarTargetHint = TargetHintBase & { value: number; kind: Exclude<TargetKind, "RANGE_TARGET"> };
export type RangeTargetHint = TargetHintBase & { minValue: number; maxValue: number; kind: "RANGE_TARGET" };
export type DefinitionAmbiguity = {
  code: string; explanation: string; evidence: readonly string[]; pendingDecision: string;
  possibleInterpretations?: readonly { code: string; description: string; behavior?: Behavior; resultSemantics?: ResultSemantics }[];
};
export type SuggestedBusinessQuestion = { code: string; prompt: string; options?: readonly { code: string; label: string }[] };
export type AnalyzerResponse = {
  ruleVersion: "DEFINITION_ASSIST_V1"; analysisStatus: AnalysisStatus;
  configurationReadiness: ConfigurationReadiness; missingConfigurationConcepts: readonly MissingConfigurationConcept[];
  originalName: string; normalizedName: string; family: Proposal<Family>; behavior: Proposal<Behavior>;
  resultSemantics: Proposal<ResultSemantics>; calculationPattern: Proposal<CalculationPattern>;
  comparison: { detected: boolean; intent: ComparisonIntent; mode: ComparisonMode | null; direction: ComparisonDirection | null };
  resultUnitHint: string | null; cadenceHint: string | null; targetHint: ScalarTargetHint | RangeTargetHint | null;
  missingConcepts: readonly string[]; ambiguities: readonly DefinitionAmbiguity[]; suggestedQuestions: readonly SuggestedBusinessQuestion[];
};

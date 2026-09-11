type RecordWithRelations = any;
export const configurationDisplayName = (record: any, revision = record.revisions?.[0]) => revision?.scoringRuleConfig?.configurationMetadata?.name || record.definition.kpiName;
export function toKpiConfigurationDto(record: RecordWithRelations) {
  const revision = record.revisions?.[0];
  const byLevel = (code: string) => revision?.thresholds?.find((item: any) => item.trafficLightLevel.code === code);
  const red = byLevel("RED"), yellow = byLevel("YELLOW"), green = byLevel("GREEN");
  return {
    id: Number(record.id), code: record.configCode, definitionId: Number(record.definition.id),
    definitionCode: record.definition.kpiCode, definitionName: configurationDisplayName(record),
    configurationName: revision?.scoringRuleConfig?.configurationMetadata?.name ?? null,
    classification: revision?.scoringRuleConfig?.configurationMetadata?.classification ?? null,
    goal: revision ? Number(revision.targetValue ?? 0) : 0,
    inputFrequencyCode: record.inputFrequency?.code ?? "MONTHLY",
    inputFrequencyName: record.inputFrequency?.name ?? "Monthly",
    periodScope: revision?.periodScope ?? "CURRENT_PERIOD",
    comparisonMode: revision?.comparisonMode ?? "NONE",
    comparisonDirection: revision?.comparisonDirection ?? null,
    calculationPattern: revision?.calculationPattern ?? null,
    calculationTemplate: revision?.calculationTemplate ?? null,
    evaluationScope: revision?.evaluationScope ?? (revision?.goalMode === "BY_SUBJECT" ? "BY_SUBJECT" : "OVERALL"),
    entityEvaluationMode: revision?.evaluationScope === "BY_SUBJECT" || revision?.goalMode === "BY_SUBJECT" ? revision?.entityEvaluationMode ?? "INDIVIDUAL" : null,
    goalType: revision?.goalType ?? (revision?.goalMode === "RANGE" ? "RANGE" : "SINGLE_VALUE"),
    goalAssignment: revision?.goalAssignment ?? (revision?.goalMode === "BY_SUBJECT" ? "DIFFERENT_GOAL_PER_SUBJECT" : null),
    goalUnit: (revision?.goalUnit ?? revision?.measurementUnit ?? record.measurementUnit).symbol,
    resultMethod: revision?.resultMethod ?? (["DERIVED", "MULTI_INPUT_CURRENT_PERIOD", "COMPOSITE"].includes(revision?.calculationPattern) ? "CALCULATED_FROM_INPUTS" : "DIRECT"),
    measurementInputs: (revision?.measurementInputs ?? []).map((item: any) => ({ name: item.inputName, unit: item.inputUnit.symbol, description: item.description ?? "" })),
    goalMode: revision?.goalMode ?? "SINGLE",
    targetKind: revision?.targetKind ?? null,
    rangeMinGoal: revision?.rangeMinValue === null || revision?.rangeMinValue === undefined ? null : Number(revision.rangeMinValue),
    rangeMaxGoal: revision?.rangeMaxValue === null || revision?.rangeMaxValue === undefined ? null : Number(revision.rangeMaxValue),
    subjectType: revision?.subjectType ?? null,
    subjects: (revision?.subjects ?? []).map((item: any) => ({ subjectExternalId: item.subjectExternalId, subjectCode: item.subjectCodeSnapshot, subjectLabel: item.subjectLabelSnapshot })),
    groupGoal: revision?.groupGoalValue == null ? null : { value: Number(revision.groupGoalValue), unit: revision.groupGoalUnit?.symbol ?? "", label: revision.groupGoalLabel ?? "" },
    subjectGoals: (revision?.subjectGoals ?? []).map((item: any) => ({ subjectExternalId: item.subjectExternalId, subjectCode: item.subjectCodeSnapshot, subjectLabel: item.subjectLabelSnapshot, goal: Number(item.goalValue), goalUnit: (item.goalUnit ?? revision.goalUnit ?? revision.measurementUnit).symbol, resultUnit: (item.resultUnit ?? revision.measurementUnit).symbol })),
    measurementUnit: (revision?.measurementUnit ?? record.measurementUnit).symbol === "N/A" ? "" : (revision?.measurementUnit ?? record.measurementUnit).symbol,
    evaluationType: revision?.evaluationType?.name ?? "",
    evaluationTypeCode: revision?.evaluationType?.code ?? null,
    resultSemantics: revision?.resultSemantics ?? null, scoringMethod: revision?.scoringMethod ?? null,
    scoringRuleConfig: revision?.scoringRuleConfig ?? null, scoringRuleConfigVersion: revision?.scoringRuleConfigVersion ?? null,
    negativeResultPolicy: revision?.negativeResultPolicy ?? null, scoringApprovalStatus: revision?.scoringApprovalStatus ?? "BLOCKED",
    dataSource: (revision?.dataSource ?? record.primaryDataSource).code === "UNSPECIFIED" ? "" : (revision?.dataSource ?? record.primaryDataSource).name,
    ranges: { redFrom: Number(red?.rangeMinPercent ?? 0), redTo: Number(red?.rangeMaxPercent ?? 0), yellowFrom: Number(yellow?.rangeMinPercent ?? 0), yellowTo: Number(yellow?.rangeMaxPercent ?? 0), greenFrom: Number(green?.rangeMinPercent ?? 0), greenTo: Number(green?.rangeMaxPercent ?? 0) },
    usedIn: 0, status: record.status.code, isActive: record.status.code !== "INACTIVE", createdAt: record.createdAt.toISOString(), createdBy: "System",
    updatedAt: (record.updatedAt ?? record.createdAt).toISOString(), updatedBy: "System", poolNames: [],
  };
}

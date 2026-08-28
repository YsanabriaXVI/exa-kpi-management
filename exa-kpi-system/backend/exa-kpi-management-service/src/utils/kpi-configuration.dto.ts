type RecordWithRelations = any;
export function toKpiConfigurationDto(record: RecordWithRelations) {
  const revision = record.revisions?.[0];
  const byLevel = (code: string) => revision?.thresholds?.find((item: any) => item.trafficLightLevel.code === code);
  const red = byLevel("RED"), yellow = byLevel("YELLOW"), green = byLevel("GREEN");
  return {
    id: Number(record.id), code: record.configCode, definitionId: Number(record.definition.id),
    definitionCode: record.definition.kpiCode, definitionName: record.definition.kpiName,
    goal: revision ? Number(revision.targetValue ?? 0) : 0,
    measurementUnit: (revision?.measurementUnit ?? record.measurementUnit).symbol === "N/A" ? "" : (revision?.measurementUnit ?? record.measurementUnit).symbol,
    evaluationType: revision?.evaluationType?.name ?? "",
    resultSemantics: revision?.resultSemantics ?? null, scoringMethod: revision?.scoringMethod ?? null,
    scoringRuleConfig: revision?.scoringRuleConfig ?? null, scoringRuleConfigVersion: revision?.scoringRuleConfigVersion ?? null,
    negativeResultPolicy: revision?.negativeResultPolicy ?? null, scoringApprovalStatus: revision?.scoringApprovalStatus ?? "BLOCKED",
    dataSource: (revision?.dataSource ?? record.primaryDataSource).code === "UNSPECIFIED" ? "" : (revision?.dataSource ?? record.primaryDataSource).name,
    ranges: { redFrom: Number(red?.rangeMinPercent ?? 0), redTo: Number(red?.rangeMaxPercent ?? 0), yellowFrom: Number(yellow?.rangeMinPercent ?? 0), yellowTo: Number(yellow?.rangeMaxPercent ?? 0), greenFrom: Number(green?.rangeMinPercent ?? 0), greenTo: Number(green?.rangeMaxPercent ?? 0) },
    usedIn: 0, status: record.status.code, isActive: record.status.code !== "INACTIVE", createdAt: record.createdAt.toISOString(), createdBy: "System",
    updatedAt: (record.updatedAt ?? record.createdAt).toISOString(), updatedBy: "System", poolNames: [],
  };
}

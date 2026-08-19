type RecordWithRelations = any;
export function toKpiConfigurationDto(record: RecordWithRelations) {
  const revision = record.revisions?.[0];
  const byLevel = (code: string) => revision?.thresholds?.find((item: any) => item.trafficLightLevel.code === code);
  const red = byLevel("RED"), yellow = byLevel("YELLOW"), green = byLevel("GREEN");
  return {
    id: Number(record.id), code: record.configCode, definitionId: Number(record.definition.id),
    definitionCode: record.definition.kpiCode, definitionName: record.definition.kpiName,
    goal: revision ? Number(revision.targetValue ?? 0) : 0,
    measurementUnit: record.measurementUnit.symbol === "N/A" ? "" : record.measurementUnit.symbol,
    evaluationType: revision?.evaluationType?.name ?? "",
    dataSource: record.primaryDataSource.code === "UNSPECIFIED" ? "" : record.primaryDataSource.name,
    ranges: { redFrom: Number(red?.rangeMinPercent ?? 0), redTo: Number(red?.rangeMaxPercent ?? 0), yellowFrom: Number(yellow?.rangeMinPercent ?? 0), yellowTo: Number(yellow?.rangeMaxPercent ?? 0), greenFrom: Number(green?.rangeMinPercent ?? 0), greenTo: Number(green?.rangeMaxPercent ?? 0) },
    usedIn: 0, status: record.status.code, isActive: record.status.code !== "INACTIVE", createdAt: record.createdAt.toISOString(), createdBy: "System",
    updatedAt: (record.updatedAt ?? record.createdAt).toISOString(), updatedBy: "System", poolNames: [],
  };
}

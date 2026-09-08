// Legacy frozen snapshots have only global units. New snapshots retain both units per entity.
export function evaluationUnits(settings: any, subjectId?: string | null) {
  const subject = subjectId == null ? null : settings?.subjectGoals?.find((row: any) => row.subjectExternalId === subjectId);
  return {
    goalUnit: subject?.goalUnit ?? settings?.goalUnit,
    resultUnit: subject?.resultUnit ?? settings?.measurementUnit,
  };
}

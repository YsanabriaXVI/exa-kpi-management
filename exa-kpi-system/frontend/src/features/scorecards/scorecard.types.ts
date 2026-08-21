export type ScorecardStatus = "ACTIVE" | "DRAFT" | "INACTIVE" | "EXPIRED";

export type ScorecardRecord = {
  id: number;
  code: string;
  name: string;
  departments: string[];
  durationMonths: number[];
  year: number;
  inputFrequency: string;
  kpis: number;
  linkedScorecards: number;
  poolSource: string;
  company: string;
  status: ScorecardStatus;
  collaborators: number;
  poolSchedule: { validFrom: string; validTo: string; frequency: string; inputPeriods: number } | null;
  currentComposition: { periodKey: string; status: "PREPARING" | "FINALIZED" | "NOT_STARTED"; kpisSelected: number; linkedScorecards: number; previous: { periodKey: string; status: "FINALIZED" } | null } | null;
};

export type ScorecardInput = Omit<ScorecardRecord, "id" | "code" | "kpis" | "linkedScorecards">;

export type ScorecardCreateRequest = {
  name: string; description?: string | null; kpiPoolExternalId: string;
  departments: Array<{ externalDepartmentId: string; companyExternalId: string; code: string; name: string }>;
  collaborators: Array<{ externalEmployeeId: string; departmentExternalId: string; code: string; name: string }>;
};
export type ScorecardPeriod = { periodKey: string; start: string; end: string; workflowStatus: string; poolCompositionStatus: string; scorecardCompositionId: string | null; scorecardCompositionStatus: "AVAILABLE" | "UNAVAILABLE" | "PREPARING" | "FINALIZED" };
export type ScorecardComposition = { id: string; periodKey: string; status: "PREPARING" | "FINALIZED"; kpis: Array<{ id: string; poolMembershipExternalId: string; kpiDefinitionExternalId: string; kpiConfigurationExternalId: string; definitionCode: string; definitionName: string; configurationCode: string; categoryName: string | null; goal: string | null; dataSource: string | null; measurementUnit: string | null; weight: string; displayOrder: number }>; linkedScorecards: Array<{ id: string; linkedScorecardId: string; code: string; name: string; status: string; companies: string[]; departments: string[]; weight: string; displayOrder: number }>; weights: { kpis: string; linkedScorecards: string; total: string }; finalizedAt: string | null };

export type ScorecardStatus = "ACTIVE" | "DRAFT" | "INACTIVE" | "EXPIRED";

export type ScorecardRecord = {
  id: number;
  code: string;
  name: string;
  departments: string[];
  scopeDepartments?: Array<{
    id: string;
    companyId: string;
    code: string;
    name: string;
    employees: Array<{ id: string; code: string; name: string; company: string }>;
  }>;
  durationMonths: number[];
  year: number;
  inputFrequency: string;
  kpis: number;
  linkedScorecards: number;
  poolSource: string;
  poolId?: number;
  company: string;
  scopeCompanies?: Array<{ id: string; code: string; name: string }>;
  status: ScorecardStatus;
  collaborators: number;
  poolSchedule: {
    validFrom: string;
    validTo: string;
    frequency: string;
    inputPeriods: number;
  } | null;
  currentComposition: {
    periodKey: string;
    status: "PREPARING" | "FINALIZED" | "NOT_STARTED";
    kpisSelected: number;
    linkedScorecards: number;
    previous: { periodKey: string; status: "FINALIZED" } | null;
  } | null;
  createdAt?: string;
  updatedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
};

export type ScorecardInput = Omit<
  ScorecardRecord,
  "id" | "code" | "kpis" | "linkedScorecards"
>;

export type ScorecardCreateRequest = {
  name: string;
  description?: string | null;
  kpiPoolExternalId: string;
  departments: Array<{
    externalDepartmentId: string;
    companyExternalId: string;
    code: string;
    name: string;
  }>;
  collaborators: Array<{
    externalEmployeeId: string;
    departmentExternalId: string;
    code: string;
    name: string;
  }>;
};
export type ScorecardPeriod = {
  periodKey: string;
  start: string;
  end: string;
  workflowStatus: string;
  dependency?: {
    canFinalize: boolean;
    previousPeriodStart: string | null;
    previousMonitoringStatus: string;
    reasonCode: "PREVIOUS_INPUT_PERIOD_NOT_CLOSED" | "MONITORING_INTEGRATION_PENDING" | null;
  };
  poolCompositionStatus: string;
  scorecardCompositionId: string | null;
  scorecardCompositionStatus:
    "AVAILABLE" | "UNAVAILABLE" | "PREPARING" | "FINALIZED";
};
export type ScorecardComposition = {
  id: string;
  periodKey: string;
  status: "PREPARING" | "FINALIZED";
  scopeCustomized: boolean;
  scope: {
    departments: Array<{
      id: string;
      code: string;
      name: string;
      companyId: string;
      collaborators: Array<{ id: string; code: string; name: string }>;
    }>;
  };
  kpis: Array<{
    id: string;
    poolMembershipExternalId: string;
    kpiDefinitionExternalId: string;
    kpiConfigurationExternalId: string;
    definitionCode: string;
    definitionName: string;
    configurationCode: string;
    categoryName: string | null;
    goal: string | null;
    dataSource: string | null;
    measurementUnit: string | null;
    weight: string;
    evaluationScope?: string;
    goalUnit?: string;
    resultUnit?: string;
    evaluations?: Array<{subjectExternalId:string;subjectCode:string|null;subjectLabel:string;goal:string|null;goalUnit?:{symbol:string};resultUnit?:{symbol:string};weight:string|null}>;
    displayOrder: number;
  }>;
  linkedScorecards: Array<{
    id: string;
    linkedScorecardId: string;
    code: string;
    name: string;
    status: string;
    companies: string[];
    departments: string[];
    weight: string;
    displayOrder: number;
  }>;
  weights: { kpis: string; linkedScorecards: string; total: string };
  finalizedAt: string | null;
};

export type PoolStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type PoolLookup = { id: string; code: string; name: string; displayOrder: number };
export type PoolLookups = { areas: PoolLookup[]; companies: PoolLookup[]; inputFrequencies: PoolLookup[] };
export type PoolListParams = {
  page: number; pageSize: number; search?: string; status?: string[]; companyId?: string[];
  inputFrequencyId?: string[]; issueYear?: string[]; sortBy: string; sortOrder: "asc" | "desc";
};

export type PoolKpi = {
  configurationId?: string;
  definitionId: string;
  configCode: string;
  kpiCode: string;
  name: string;
  category: string;
  goal: string;
  measurementUnit: string;
  dataSource: string;
  status: "ACTIVE" | "INACTIVE";
};

export type PoolKpiAvailability = "AVAILABLE" | "IN_POOL" | "NOT_AVAILABLE";

export type ManageablePoolKpi = PoolKpi & {
  availability: PoolKpiAvailability;
  reasonCode?: string | null;
  conflictingConfigurationCode?: string | null;
};

export type PoolInputPeriod = {
  start: string;
  end: string;
  configurationStatus: "EDITABLE" | "POOL_COMPOSITION_LOCKED" | "FUTURE_NOT_AVAILABLE";
  canEditComposition: boolean;
  canFinalizeComposition: boolean;
  workflowStatus: "EDITABLE" | "FINALIZED" | "FUTURE";
  dependency: {
    canFinalize: boolean;
    previousPeriodStart: string | null;
    previousMonitoringStatus: "NOT_REQUIRED" | "UNKNOWN" | "OPEN" | "PENDING" | "CLOSED" | "CLOSED_WITH_APPROVED_EXCEPTION";
    reasonCode: "PREVIOUS_INPUT_PERIOD_NOT_CLOSED" | "MONITORING_INTEGRATION_PENDING" | null;
  };
};
export type PoolInputPeriods = { data: PoolInputPeriod[]; meta: { defaultPeriodStart: string | null; editabilitySource: string } };

export type PoolScorecard = {
  code: string;
  name: string;
  company: string;
  duration: string;
  frequency: string;
  selectedKpis: string;
  expectedInputs: number;
  status: "ACTIVE" | "INACTIVE";
};

export type KpiPoolRecord = {
  id: number;
  code: string;
  name: string;
  companies: string[];
  companyIds?: string[];
  areas?: string[];
  areaIds?: string[];
  frequency: string;
  inputFrequencyId?: string;
  validFrom: string;
  validTo: string;
  description: string;
  status: PoolStatus;
  kpiCount?: number;
  scorecardCount?: number;
  operationalPeriod?: { periodKey: string; start: string; end: string; status: "FINALIZED" | "PREPARING"; kpiCount: number | null; next: { periodKey: string; start: string; status: "PREPARING" } | null } | null;
  kpis: PoolKpi[];
  scorecards: PoolScorecard[];
};

export type KpiPoolInput = Pick<
  KpiPoolRecord,
  | "name"
  | "companies"
  | "frequency"
  | "validFrom"
  | "validTo"
  | "description"
> & {
  companyIds: string[];
  poolAreaIds: string[];
  inputFrequencyId: string;
};

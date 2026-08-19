export type PoolStatus = "ACTIVE" | "INACTIVE";

export type PoolKpi = {
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
};

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
  frequency: string;
  validFrom: string;
  validTo: string;
  description: string;
  status: PoolStatus;
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
  | "status"
>;

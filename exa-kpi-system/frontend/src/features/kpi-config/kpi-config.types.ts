export type KpiConfigStatus = "CONFIGURED" | "INCOMPLETE" | "INACTIVE";

export type TrafficLightRanges = {
  redFrom: number;
  redTo: number;
  yellowFrom: number;
  yellowTo: number;
  greenFrom: number;
  greenTo: number;
};

export type KpiConfigRecord = {
  id: number;
  code: string;
  definitionId: number;
  definitionCode: string;
  definitionName: string;
  goal: number;
  measurementUnit: string;
  evaluationType: string;
  dataSource: string;
  ranges: TrafficLightRanges;
  usedIn: number;
  status: KpiConfigStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  poolNames: string[];
};

export type KpiConfigInput = Omit<
  KpiConfigRecord,
  | "id"
  | "code"
  | "definitionCode"
  | "definitionName"
  | "evaluationType"
  | "usedIn"
  | "status"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "poolNames"
>;

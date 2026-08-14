export const KPI_DEFINITION_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type KpiDefinitionStatus = (typeof KPI_DEFINITION_STATUSES)[number];

export type KpiDefinition = {
  id: number;
  code: string;
  name: string;
  objective: string;
  category: string;
  status: KpiDefinitionStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type KpiDefinitionInput = Pick<
  KpiDefinition,
  "name" | "objective" | "category" | "status"
>;

export type KpiConfigUsage = {
  id: number;
  code: string;
  goal: number;
  measurementUnit: string;
  evaluationType: string;
  dataSource: string;
  status: "CONFIGURED" | "INCOMPLETE" | "INACTIVE";
};

export const KPI_DEFINITION_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type KpiDefinitionStatus = (typeof KPI_DEFINITION_STATUSES)[number];
export type KpiDefinitionSortBy = "kpiCode" | "kpiName" | "description" | "category" | "statusCode" | "createdAt" | "updatedAt";
export type SortOrder = "asc" | "desc";

export type KpiCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type KpiDefinition = {
  id: string;
  kpiCode: string;
  kpiName: string;
  description: string;
  status: KpiDefinitionStatus;
  isActive: boolean;
  category: Pick<KpiCategory, "id" | "code" | "name">;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type PaginationMeta = { page: number; pageSize: number; totalItems: number; totalPages: number };
export type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta };

export type KpiDefinitionConfigurationSummary = {
  id: string;
  configCode: string;
  goal: number | null;
  measurementUnit: string | null;
  inputFrequency: string;
  dataSource: string | null;
  status: string;
};
export type KpiDefinitionConfigurationsResponse = PaginatedResponse<KpiDefinitionConfigurationSummary> & {
  meta: PaginationMeta & { configuredItems: number };
};

export type KpiDefinitionListParams = {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string[];
  status?: KpiDefinitionStatus[];
  sortBy: KpiDefinitionSortBy;
  sortOrder: SortOrder;
};

export type CreateKpiDefinitionInput = {
  kpiName: string;
  description: string;
  kpiCategoryId: string;
  isActive?: boolean;
};
export type UpdateKpiDefinitionInput = Partial<Omit<CreateKpiDefinitionInput, "isActive">>;

export type LegacyKpiDefinitionOption = {
  id: string;
  code: string;
  name: string;
  objective: string;
  status: KpiDefinitionStatus;
};

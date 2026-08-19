import { apiRequest } from "../../api/http-client";
import type {
  CreateKpiDefinitionInput, KpiCategory, KpiDefinition, KpiDefinitionListParams,
  KpiDefinitionConfigurationsResponse, LegacyKpiDefinitionOption, PaginatedResponse, UpdateKpiDefinitionInput,
} from "./kpi-definition.types";

const envelope = <T>(path: string, init?: RequestInit) => apiRequest<{ data: T }>(path, init).then((response) => response.data);

export const kpiDefinitionKeys = {
  all: ["kpi-definitions"] as const,
  list: (params: KpiDefinitionListParams) => [...kpiDefinitionKeys.all, "list", params] as const,
  detail: (id: string) => [...kpiDefinitionKeys.all, "detail", id] as const,
  configurations: (id: string, page = 1) => [...kpiDefinitionKeys.detail(id), "configurations", page] as const,
  search: (term: string) => [...kpiDefinitionKeys.all, "search", term] as const,
  categories: ["kpi-categories"] as const,
};

export const kpiDefinitionService = {
  list(params: KpiDefinitionListParams): Promise<PaginatedResponse<KpiDefinition>> {
    const query = new URLSearchParams({
      page: String(params.page), pageSize: String(params.pageSize),
      sortBy: params.sortBy, sortOrder: params.sortOrder,
    });
    if (params.search) query.set("search", params.search);
    params.categoryId?.forEach((categoryId) => query.append("categoryId", categoryId));
    params.status?.forEach((status) => query.append("status", status));
    return apiRequest(`/v1/kpi-definitions?${query}`);
  },
  get(id: string) { return envelope<KpiDefinition>(`/v1/kpi-definitions/${id}`); },
  listConfigurations(id: string, page = 1, pageSize = 20) {
    return apiRequest<KpiDefinitionConfigurationsResponse>(`/v1/kpi-definitions/${id}/configurations?page=${page}&pageSize=${pageSize}`);
  },
  listCategories() { return envelope<KpiCategory[]>("/v1/kpi-categories"); },
  create(input: CreateKpiDefinitionInput) {
    return envelope<KpiDefinition>("/v1/kpi-definitions", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string, input: UpdateKpiDefinitionInput) {
    return envelope<KpiDefinition>(`/v1/kpi-definitions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  activate(id: string) { return envelope<KpiDefinition>(`/v1/kpi-definitions/${id}/activate`, { method: "PATCH" }); },
  deactivate(id: string) { return envelope<KpiDefinition>(`/v1/kpi-definitions/${id}/deactivate`, { method: "PATCH" }); },
  softDelete(id: string) { return envelope<KpiDefinition>(`/v1/kpi-definitions/${id}`, { method: "DELETE" }); },
  async listLegacyConfigurationOptions(): Promise<LegacyKpiDefinitionOption[]> {
    const result = await this.list({ page: 1, pageSize: 100, status: ["ACTIVE"], sortBy: "kpiCode", sortOrder: "asc" });
    return result.data.map((item) => ({
      // Temporary numeric projection required only by the still-mock KPI Configuration module.
      id: item.id, code: item.kpiCode,
      name: item.kpiName, objective: item.description, status: item.status,
    }));
  },
  async searchActiveOptions(search: string): Promise<LegacyKpiDefinitionOption[]> {
    const result = await this.list({ page: 1, pageSize: 6, ...(search ? { search } : {}), status: ["ACTIVE"], sortBy: "kpiCode", sortOrder: "asc" });
    return result.data.map((item) => ({ id: item.id, code: item.kpiCode, name: item.kpiName, objective: item.description, status: item.status }));
  },
};

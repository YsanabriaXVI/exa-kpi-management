import { apiRequest } from "../../api/http-client";

const data = <T>(path: string, init?: RequestInit) => apiRequest<{ data: T }>(path, init).then((response) => response.data);
const body = (method: "POST" | "PATCH", value?: unknown): RequestInit => ({ method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
const base = "/v1/catalog-management";

export type SubjectTypeItem = { id: string; code: string; name: string; isActive: boolean; valueCount: number; activeValueCount: number; referenceCount: number };
export type SubjectValueItem = { id: string; externalId: string; code: string; name: string; isActive: boolean; referenceCount: number };
export type MeasurementUnitItem = { id: string; code: string; symbol: string; name: string; description: string | null; decimalPlaces: number; isPercentage: boolean; isActive: boolean; referenceCount: number; duplicateOf: { id: string; code: string } | null };
export type DataSourceItem = { id: string; code: string; name: string; description: string | null; sourceType: string; isExternal: boolean; supportsAutomation: boolean; isActive: boolean; referenceCount: number };
export type CatalogUsageItem = { configurationId: string; configCode: string; kpiCode: string; kpiName: string; revisionNumber: number; status: string; effectiveFrom: string; effectiveTo: string | null };

export const catalogManagementService = {
  subjectTypes: () => data<SubjectTypeItem[]>(`${base}/subject-types`),
  createSubjectType: (value: { code: string; name: string }) => data<SubjectTypeItem>(`${base}/subject-types`, body("POST", value)),
  updateSubjectType: (id: string, value: { code: string; name: string }) => data<SubjectTypeItem>(`${base}/subject-types/${id}`, body("PATCH", value)),
  toggleSubjectType: (id: string) => data<SubjectTypeItem>(`${base}/subject-types/${id}/toggle`, body("PATCH")),
  subjectValues: (code: string) => data<SubjectValueItem[]>(`${base}/subject-types/${encodeURIComponent(code)}/values`),
  createSubjectValue: (code: string, value: { code: string; name: string }) => data<SubjectValueItem>(`${base}/subject-types/${encodeURIComponent(code)}/values`, body("POST", value)),
  updateSubjectValue: (id: string, value: { code: string; name: string }) => data<SubjectValueItem>(`${base}/subject-values/${id}`, body("PATCH", value)),
  toggleSubjectValue: (id: string) => data<SubjectValueItem>(`${base}/subject-values/${id}/toggle`, body("PATCH")),
  measurementUnits: () => data<MeasurementUnitItem[]>(`${base}/measurement-units`),
  createMeasurementUnit: (value: Omit<MeasurementUnitItem, "id" | "isActive" | "referenceCount" | "duplicateOf">) => data<MeasurementUnitItem>(`${base}/measurement-units`, body("POST", value)),
  updateMeasurementUnit: (id: string, value: Omit<MeasurementUnitItem, "id" | "isActive" | "referenceCount" | "duplicateOf">) => data<MeasurementUnitItem>(`${base}/measurement-units/${id}`, body("PATCH", value)),
  toggleMeasurementUnit: (id: string) => data<MeasurementUnitItem>(`${base}/measurement-units/${id}/toggle`, body("PATCH")),
  dataSources: () => data<DataSourceItem[]>(`${base}/data-sources`),
  createDataSource: (value: Omit<DataSourceItem, "id" | "isActive" | "referenceCount">) => data<DataSourceItem>(`${base}/data-sources`, body("POST", value)),
  updateDataSource: (id: string, value: Omit<DataSourceItem, "id" | "isActive" | "referenceCount">) => data<DataSourceItem>(`${base}/data-sources/${id}`, body("PATCH", value)),
  toggleDataSource: (id: string) => data<DataSourceItem>(`${base}/data-sources/${id}/toggle`, body("PATCH")),
  usage: (kind: "subject-type" | "subject-value" | "measurement-unit" | "data-source", id: string) => data<CatalogUsageItem[]>(`${base}/usage/${kind}/${id}`),
};

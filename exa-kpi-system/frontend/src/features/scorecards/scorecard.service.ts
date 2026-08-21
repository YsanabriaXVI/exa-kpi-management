import type { ScorecardComposition, ScorecardCreateRequest, ScorecardPeriod, ScorecardRecord } from "./scorecard.types";

const baseUrl = (import.meta.env.VITE_SCORECARDS_API_URL as string | undefined) ?? "http://localhost:4003/api";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body?.error?.message ?? `Scorecards API returned ${response.status}`); }
  return response.status === 204 ? undefined as T : response.json();
}

type ApiScorecard = { id: string; code: string; name: string; status: string; kpiPool: { id: string; code: string; name: string }; poolSchedule: { validFrom: string; validTo: string; inputFrequencyCode: string; inputPeriods: number } | null; currentComposition: ScorecardRecord["currentComposition"]; companies: Array<{ name: string }>; departments: Array<{ name: string; collaborators: unknown[] }>; periodCompositionCount: number };
const map = (value: ApiScorecard): ScorecardRecord => {
  const start = value.poolSchedule?.validFrom; const end = value.poolSchedule?.validTo;
  const startMonth = start ? Number(start.slice(5, 7)) - 1 : -1; const endMonth = end ? Number(end.slice(5, 7)) - 1 : -1;
  const frequency = value.poolSchedule?.inputFrequencyCode.replace(/_/g, " ").toLowerCase();
  const frequencyName = frequency ? frequency.replace(/^./, (letter: string) => letter.toUpperCase()) : "Unavailable";
  return { id: Number(value.id), code: value.code, name: value.name, departments: value.departments.map((row) => row.name), durationMonths: start && end && start.slice(0, 4) === end.slice(0, 4) ? Array.from({ length: endMonth - startMonth + 1 }, (_, index) => startMonth + index) : [], year: start ? Number(start.slice(0, 4)) : 0, inputFrequency: frequencyName, kpis: value.currentComposition?.kpisSelected ?? 0, linkedScorecards: value.currentComposition?.linkedScorecards ?? 0, poolSource: `${value.kpiPool.code} · ${value.kpiPool.name}`, company: value.companies.map((row) => row.name).join(", "), status: value.status as ScorecardRecord["status"], collaborators: value.departments.reduce((sum, row) => sum + row.collaborators.length, 0), poolSchedule: value.poolSchedule ? { validFrom: value.poolSchedule.validFrom, validTo: value.poolSchedule.validTo, frequency: frequencyName, inputPeriods: value.poolSchedule.inputPeriods } : null, currentComposition: value.currentComposition };
};

export const scorecardService = {
  async listPage(input: { page: number; pageSize: number; search?: string; status?: string[]; department?: string[]; frequency?: string[]; year?: string[]; sortBy?: string; sortOrder?: "asc" | "desc" }) { const params = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize), sortBy: input.sortBy ?? "createdAt", sortOrder: input.sortOrder ?? "desc" }); if (input.search) params.set("search", input.search); input.status?.forEach((value) => params.append("status", value)); input.department?.forEach((value) => params.append("department", value)); input.frequency?.forEach((value) => params.append("frequency", value.toUpperCase().replace(/ /g, "_"))); input.year?.forEach((value) => params.append("year", value)); const response = await request<{ data: ApiScorecard[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } }>(`/v1/scorecards?${params}`); return { data: response.data.map(map), meta: response.meta }; },
  async list() { return (await scorecardService.listPage({ page: 1, pageSize: 100 })).data; },
  async getById(id: number) { return map((await request<{ data: ApiScorecard }>(`/v1/scorecards/${id}`)).data); },
  async create(input: ScorecardCreateRequest) { return map((await request<{ data: ApiScorecard }>("/v1/scorecards", { method: "POST", body: JSON.stringify(input) })).data); },
  async deactivate(id: number) { await request(`/v1/scorecards/${id}/deactivate`, { method: "PATCH" }); },
  async periods(id: number) { return (await request<{ data: ScorecardPeriod[] }>(`/v1/scorecards/${id}/periods`)).data; },
  async composition(id: number, periodKey: string) { return (await request<{ data: ScorecardComposition }>(`/v1/scorecards/${id}/periods/${periodKey}/composition`)).data; },
  async availableKpis(id: number, periodKey: string) { return (await request<{ data: Array<{ poolMembershipExternalId: string; kpiConfigurationExternalId: string; definitionCode: string; definitionName: string; configurationCode: string; selectionStatus: string }> }>(`/v1/scorecards/${id}/periods/${periodKey}/available-kpis`)).data; },
  async addKpis(id: number, periodKey: string, items: Array<{ poolMembershipExternalId: string; weight: number }>) { return (await request<{ data: ScorecardComposition }>(`/v1/scorecards/${id}/periods/${periodKey}/kpis`, { method: "POST", body: JSON.stringify({ items }) })).data; },
  async removeKpi(id: number, periodKey: string, configurationId: string) { await request(`/v1/scorecards/${id}/periods/${periodKey}/kpis/${configurationId}`, { method: "DELETE" }); },
  async updateWeights(id: number, periodKey: string, body: { kpis: Array<{ kpiConfigurationExternalId: string; weight: number }>; linkedScorecards: Array<{ linkedScorecardId: string; weight: number }> }) { return (await request<{ data: ScorecardComposition }>(`/v1/scorecards/${id}/periods/${periodKey}/weights`, { method: "PATCH", body: JSON.stringify(body) })).data; },
  async availableLinks(id: number, periodKey: string) { return (await request<{ data: Array<{ id: string; code: string; name: string; status: string; selectionStatus: string }> }>(`/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards`)).data; },
  async addLink(id: number, periodKey: string, linkedScorecardId: string, weight: number) { return (await request<{ data: ScorecardComposition }>(`/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards`, { method: "POST", body: JSON.stringify({ linkedScorecardId, weight }) })).data; },
  async removeLink(id: number, periodKey: string, linkedScorecardId: string) { await request(`/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards/${linkedScorecardId}`, { method: "DELETE" }); },
  async finalize(id: number, periodKey: string) { return (await request<{ data: ScorecardComposition }>(`/v1/scorecards/${id}/periods/${periodKey}/finalize`, { method: "POST" })).data; },
  async poolWorkflow(poolId: number, periodKey: string) { return (await request<{ data: { status: "NOT_STARTED" | "IN_PROGRESS" | "FINALIZED"; totalScorecards: number; preparing: number; finalized: number; pending: number } }>(`/v1/scorecards/pool-workflow?poolId=${poolId}&periodKey=${periodKey}`)).data; },
  async poolUsageBatch(targets: Array<{ poolId: string; periodKey: string }>) { return (await request<{ data: Array<{ poolId: string; periodKey: string; scorecardsUsing: number }> }>("/v1/scorecards/pool-workflow/batch", { method: "POST", body: JSON.stringify({ targets }) })).data; },
};

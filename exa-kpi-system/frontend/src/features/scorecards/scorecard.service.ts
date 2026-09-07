import type {
  ScorecardComposition,
  ScorecardCreateRequest,
  ScorecardPeriod,
  ScorecardRecord,
} from "./scorecard.types";

const baseUrl =
  (import.meta.env.VITE_SCORECARDS_API_URL as string | undefined) ??
  "http://localhost:4003/api";
export class ScorecardApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ScorecardApiError";
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ScorecardApiError(
      response.status,
      body?.error?.code ?? "SCORECARDS_API_ERROR",
      body?.error?.message ?? `Scorecards API returned ${response.status}`,
      body?.error?.details,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

type ApiScorecard = {
  id: string;
  code: string;
  name: string;
  status: string;
  kpiPool: { id: string; code: string; name: string };
  poolSchedule: {
    validFrom: string;
    validTo: string;
    inputFrequencyCode: string;
    inputPeriods: number;
  } | null;
  currentComposition: ScorecardRecord["currentComposition"];
  companies: Array<{ id: string; code: string; name: string }>;
  departments: Array<{
    id: string;
    companyId: string;
    code: string;
    name: string;
    collaborators: Array<{ id: string; code: string; name: string }>;
  }>;
  periodCompositionCount: number;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};
export type PoolScorecardUsage = {
  poolId: string;
  periodKey: string;
  assignedKpiCount: number;
  scorecardsUsingCount: number;
  assignments: Array<{
    kpiConfigurationId: string;
    configurationCode: string;
    kpiCode: string;
    kpiName: string;
    scorecardId: string;
    scorecardCode: string;
    scorecardName: string;
    scorecardCompositionStatus: "PREPARING" | "FINALIZED";
    departments: string[];
  }>;
};
export type AvailableScorecardKpi = {
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
  displayOrder: number;
  status?: "ACTIVE" | "INACTIVE";
  selectionStatus:
    | "AVAILABLE_TO_SELECT"
    | "SELECTED_IN_SCORECARD"
    | "ASSIGNED_TO_ANOTHER_SCORECARD"
    | "NOT_AVAILABLE";
  assignedScorecard: { id: string; code: string; name: string } | null;
};
export type AvailableLinkedScorecard = {
  id: string;
  code: string;
  name: string;
  departments?: string[];
  status: string;
  compositionStatus?: string;
  selectionStatus:
    | "AVAILABLE_TO_LINK"
    | "SELECTED_IN_SCORECARD"
    | "LINKED_THIS_PERIOD"
    | "LINKED_WAITING_FOR_FINALIZATION"
    | "NOT_AVAILABLE";
  reasonCode?:
    | "SELF_REFERENCE"
    | "CIRCULAR_REFERENCE"
    | "INACTIVE_SCORECARD"
    | "INPUT_PERIOD_NOT_AVAILABLE"
    | null;
};
const map = (value: ApiScorecard): ScorecardRecord => {
  const start = value.poolSchedule?.validFrom;
  const end = value.poolSchedule?.validTo;
  const startMonth = start ? Number(start.slice(5, 7)) - 1 : -1;
  const endMonth = end ? Number(end.slice(5, 7)) - 1 : -1;
  const frequency = value.poolSchedule?.inputFrequencyCode
    .replace(/_/g, " ")
    .toLowerCase();
  const frequencyName = frequency
    ? frequency.replace(/^./, (letter: string) => letter.toUpperCase())
    : "Unavailable";
  return {
    id: Number(value.id),
    code: value.code,
    name: value.name,
    departments: value.departments.map((row) => row.name),
    scopeDepartments: value.departments.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      code: row.code,
      name: row.name,
      employees: row.collaborators.map((employee) => ({
        id: employee.id,
        code: employee.code,
        name: employee.name,
        company:
          value.companies.map((company) => company.name).join(", ") ||
          "Company unavailable",
      })),
    })),
    durationMonths:
      start && end && start.slice(0, 4) === end.slice(0, 4)
        ? Array.from(
            { length: endMonth - startMonth + 1 },
            (_, index) => startMonth + index,
          )
        : [],
    year: start ? Number(start.slice(0, 4)) : 0,
    inputFrequency: frequencyName,
    kpis: value.currentComposition?.kpisSelected ?? 0,
    linkedScorecards: value.currentComposition?.linkedScorecards ?? 0,
    poolSource: `${value.kpiPool.code} · ${value.kpiPool.name}`,
    poolId: Number(value.kpiPool.id),
    company: value.companies.map((row) => row.name).join(", "),
    scopeCompanies: value.companies,
    status: value.status as ScorecardRecord["status"],
    collaborators: value.departments.reduce(
      (sum, row) => sum + row.collaborators.length,
      0,
    ),
    poolSchedule: value.poolSchedule
      ? {
          validFrom: value.poolSchedule.validFrom,
          validTo: value.poolSchedule.validTo,
          frequency: frequencyName,
          inputPeriods: value.poolSchedule.inputPeriods,
        }
      : null,
    currentComposition: value.currentComposition,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    createdBy: value.createdByUserId
      ? `User #${value.createdByUserId}`
      : "System",
    updatedBy: value.updatedByUserId
      ? `User #${value.updatedByUserId}`
      : "System",
  };
};

export const scorecardService = {
  async listPage(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string[];
    department?: string[];
    poolId?: string[];
    frequency?: string[];
    year?: string[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const params = new URLSearchParams({
      page: String(input.page),
      pageSize: String(input.pageSize),
      sortBy: input.sortBy ?? "createdAt",
      sortOrder: input.sortOrder ?? "desc",
    });
    if (input.search) params.set("search", input.search);
    input.status?.forEach((value) => params.append("status", value));
    input.department?.forEach((value) => params.append("department", value));
    input.poolId?.forEach((value) => params.append("poolId", value));
    input.frequency?.forEach((value) =>
      params.append("frequency", value.toUpperCase().replace(/ /g, "_")),
    );
    input.year?.forEach((value) => params.append("year", value));
    const response = await request<{
      data: ApiScorecard[];
      meta: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
      };
    }>(`/v1/scorecards?${params}`);
    return { data: response.data.map(map), meta: response.meta };
  },
  async list() {
    return (await scorecardService.listPage({ page: 1, pageSize: 100 })).data;
  },
  async getById(id: number) {
    return map(
      (await request<{ data: ApiScorecard }>(`/v1/scorecards/${id}`)).data,
    );
  },
  async create(input: ScorecardCreateRequest) {
    return map(
      (
        await request<{ data: ApiScorecard }>("/v1/scorecards", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    );
  },
  async updateInfo(id: number, input: Pick<ScorecardCreateRequest, "name"> & Partial<Pick<ScorecardCreateRequest, "departments" | "collaborators">>) {
    return map(
      (await request<{ data: ApiScorecard }>(`/v1/scorecards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      })).data,
    );
  },
  async deactivate(id: number) {
    await request(`/v1/scorecards/${id}/deactivate`, { method: "PATCH" });
  },
  async periods(id: number) {
    return (
      await request<{ data: ScorecardPeriod[] }>(`/v1/scorecards/${id}/periods`)
    ).data;
  },
  async composition(id: number, periodKey: string) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/composition`,
      )
    ).data;
  },
  async updatePeriodScope(
    id: number,
    periodKey: string,
    input: {
      departments: Array<{
        id: string;
        companyId: string;
        code: string;
        name: string;
        collaborators: Array<{ id: string; code: string; name: string }>;
      }>;
    },
  ) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/scope`,
        { method: "PUT", body: JSON.stringify(input) },
      )
    ).data;
  },
  async availableKpis(id: number, periodKey: string) {
    return (
      await request<{ data: AvailableScorecardKpi[] }>(
        `/v1/scorecards/${id}/periods/${periodKey}/available-kpis`,
      )
    ).data;
  },
  async addKpis(
    id: number,
    periodKey: string,
    items: Array<{ poolMembershipExternalId: string; weight: number }>,
  ) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/kpis`,
        { method: "POST", body: JSON.stringify({ items }) },
      )
    ).data;
  },
  async removeKpi(id: number, periodKey: string, configurationId: string) {
    await request(
      `/v1/scorecards/${id}/periods/${periodKey}/kpis/${configurationId}`,
      { method: "DELETE" },
    );
  },
  async updateWeights(
    id: number,
    periodKey: string,
    body: {
      kpis: Array<{ kpiConfigurationExternalId: string; weight: number; entityWeights?: Array<{subjectExternalId:string;weight:number|null}> }>;
      linkedScorecards: Array<{ linkedScorecardId: string; weight: number }>;
    },
  ) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/weights`,
        { method: "PATCH", body: JSON.stringify(body) },
      )
    ).data;
  },
  async availableLinks(id: number, periodKey: string) {
    return (
      await request<{ data: AvailableLinkedScorecard[] }>(
        `/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards`,
      )
    ).data;
  },
  async addLink(
    id: number,
    periodKey: string,
    linkedScorecardId: string,
    weight: number,
  ) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards`,
        { method: "POST", body: JSON.stringify({ linkedScorecardId, weight }) },
      )
    ).data;
  },
  async addLinks(
    id: number,
    periodKey: string,
    items: Array<{ linkedScorecardId: string; weight: number }>,
  ) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards`,
        { method: "POST", body: JSON.stringify({ items }) },
      )
    ).data;
  },
  async removeLink(id: number, periodKey: string, linkedScorecardId: string) {
    await request(
      `/v1/scorecards/${id}/periods/${periodKey}/linked-scorecards/${linkedScorecardId}`,
      { method: "DELETE" },
    );
  },
  async finalize(id: number, periodKey: string) {
    return (
      await request<{ data: ScorecardComposition }>(
        `/v1/scorecards/${id}/periods/${periodKey}/finalize`,
        { method: "POST" },
      )
    ).data;
  },
  async poolWorkflow(poolId: number, periodKey: string) {
    return (
      await request<{
        data: {
          status: "NOT_STARTED" | "IN_PROGRESS" | "FINALIZED";
          totalScorecards: number;
          preparing: number;
          finalized: number;
          pending: number;
        };
      }>(`/v1/scorecards/pool-workflow?poolId=${poolId}&periodKey=${periodKey}`)
    ).data;
  },
  async poolUsageBatch(targets: Array<{ poolId: string; periodKey: string }>) {
    return (
      await request<{
        data: Array<{
          poolId: string;
          periodKey: string;
          scorecardsUsing: number;
        }>;
      }>("/v1/scorecards/pool-workflow/batch", {
        method: "POST",
        body: JSON.stringify({ targets }),
      })
    ).data;
  },
  async poolUsage(poolId: number, periodKey: string) {
    return (
      await request<{ data: PoolScorecardUsage }>(
        `/v1/scorecards/pool-usage?poolId=${poolId}&periodKey=${encodeURIComponent(periodKey)}`,
      )
    ).data;
  },
};

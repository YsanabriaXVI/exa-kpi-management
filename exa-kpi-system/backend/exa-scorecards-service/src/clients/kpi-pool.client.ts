import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export type PoolRecord = { id: string; poolCode: string; poolName: string; status: string; issueYear: number; validFrom: string; validTo: string; inputFrequency: { id: string; code: string }; companies: Array<{ id: string; code: string; name: string }>; areas: Array<{ id: string; code: string; name: string }> };
export type PoolPeriod = { poolPeriodId: string | null; poolCompositionId: string | null; periodKey: string; start: string; end: string; workflowStatus: string };
export type PoolMembership = {
  membershipId: string;
  configurationId: string;
  definitionId: string;
  configCode: string;
  definitionCode: string;
  definitionName: string;
  displayOrder: number;
  categoryName: string | null;
  goal: string | null;
  dataSource: string | null;
  measurementUnit: string | null;
};

async function request<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${env.KPI_POOL_BASE_URL}${path}`, { signal: AbortSignal.timeout(env.KPI_POOL_TIMEOUT_MS) });
    if (!response.ok) throw new AppError(response.status === 404 ? 404 : 502, response.status === 404 ? "KPI_POOL_NOT_FOUND" : "KPI_POOL_CONTRACT_ERROR", `KPI Pool returned HTTP ${response.status}`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "KPI_POOL_UNAVAILABLE", "KPI Pool Service is unavailable");
  }
}

export const kpiPoolClient = {
  async getPool(id: string) { return (await request<{ data: PoolRecord }>(`/api/v1/kpi-pools/${id}`)).data; },
  async periods(id: string) { return (await request<{ data: PoolPeriod[] }>(`/api/v1/kpi-pools/${id}/input-periods`)).data; },
  async memberships(id: string, periodStart: string) {
    return (await request<{ data: PoolMembership[] }>(`/api/v1/kpi-pools/${id}/kpi-configurations?periodStart=${encodeURIComponent(periodStart)}`)).data;
  },
  async eligiblePools() {
    const result = await request<{ data: PoolRecord[] }>("/api/v1/kpi-pools?page=1&pageSize=100&status=ACTIVE&sortBy=poolName&sortOrder=asc");
    return Promise.all(result.data.map(async (pool) => {
      const periods = await kpiPoolClient.periods(pool.id);
      return { id: pool.id, poolCode: pool.poolCode, poolName: pool.poolName, companies: pool.companies.map(({ id, code, name }) => ({ id, code, name })), validFrom: pool.validFrom, validTo: pool.validTo, frequency: { id: pool.inputFrequency.id, code: pool.inputFrequency.code, name: formatFrequency(pool.inputFrequency.code) }, inputPeriods: periods.length };
    }));
  },
};

function formatFrequency(code: string) { return code.toLowerCase().replace(/(^|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`); }

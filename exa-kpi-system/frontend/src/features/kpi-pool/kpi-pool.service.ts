import type { KpiConfigRecord } from "../kpi-config/kpi-config.types";
import type { ScorecardRecord } from "../scorecards/scorecard.types";
import { poolApiRequest } from "../../api/pool-http-client";
import type { KpiPoolInput, KpiPoolRecord, ManageablePoolKpi, PoolInputPeriods, PoolKpi, PoolListParams, PoolLookups, PoolScorecard } from "./kpi-pool.types";

type PoolApiRecord = {
  id: string; poolCode: string; poolName: string; description: string | null; status: "DRAFT" | "ACTIVE" | "INACTIVE";
  validFrom: string; validTo: string; inputFrequency: { id: string; code: string };
  areas: Array<{ id: string; code: string; name: string }>;
  companies: Array<{ id: string; code: string; name: string }>;
  kpiCount: number; scorecardCount: number;
};

type PoolListResponse = { data: PoolApiRecord[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } };
type AvailabilityApiRecord = {
  id: string; configCode: string; definitionId: string; definitionCode: string; definitionName: string;
  categoryName: string; goal: string | null; measurementUnit: string; dataSource: string; isActive: boolean;
  availability: "AVAILABLE_TO_ADD" | "ALREADY_IN_POOL" | "NOT_AVAILABLE"; reasonCode: string | null; conflictingConfigurationCode?: string | null;
};
type MembershipApiRecord = { configurationId: string; definitionId: string; configCode: string; definitionCode: string; definitionName: string; inputFrequencyCode: string; effectiveFrom: string; effectiveTo: string | null; categoryName: string | null; goal: string | null; measurementUnit: string | null; dataSource: string | null; isActive: boolean };

const frequencyName = (code: string) => code.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
const fromApi = (value: PoolApiRecord): KpiPoolRecord => ({
  id: Number(value.id), code: value.poolCode, name: value.poolName,
  companies: value.companies.map((company) => company.name), companyIds: value.companies.map((company) => company.id),
  areas: value.areas.map((area) => area.name), areaIds: value.areas.map((area) => area.id),
  frequency: frequencyName(value.inputFrequency.code), inputFrequencyId: value.inputFrequency.id,
  validFrom: value.validFrom, validTo: value.validTo, description: value.description ?? "", status: value.status,
  kpiCount: value.kpiCount, scorecardCount: value.scorecardCount,
  kpis: [], scorecards: [],
});

function cachePool(pool: KpiPoolRecord) {
  pools = [pool, ...pools.filter((item) => item.id !== pool.id)];
  return pool;
}

const sampleKpis: PoolKpi[] = [
  { definitionId: "3", configCode: "KPC-049-01", kpiCode: "KPI-049", name: "Reduce operating costs", category: "Financial", goal: "Reduce 20%", measurementUnit: "%", dataSource: "EMS - SAP Integration", status: "ACTIVE" },
  { definitionId: "4", configCode: "KPC-050-01", kpiCode: "KPI-050", name: "Productivity kms/head", category: "Financial", goal: "3,700 kms", measurementUnit: "$/km", dataSource: "EMS - GPS Integration", status: "ACTIVE" },
  { definitionId: "2", configCode: "KPC-051-01", kpiCode: "KPI-051", name: "Increase container sales", category: "Financial", goal: "+100", measurementUnit: "$", dataSource: "Depot - EMS", status: "ACTIVE" },
  { definitionId: "5", configCode: "KPC-052-01", kpiCode: "KPI-052", name: "Transport damage", category: "Quality", goal: "0 damage", measurementUnit: "Count", dataSource: "EMS", status: "ACTIVE" },
  { definitionId: "6", configCode: "KPC-053-01", kpiCode: "KPI-053", name: "Increase Genset sales", category: "Quality", goal: "+5%", measurementUnit: "$", dataSource: "Depot - EMS", status: "ACTIVE" },
];

let kpiCatalog: PoolKpi[] = [
  ...sampleKpis,
  { definitionId: "legacy:58", configCode: "KPC-052-02", kpiCode: "KPI-058", name: "On-time delivery without service incidents", category: "Operations", goal: "100%", measurementUnit: "%", dataSource: "EMS", status: "ACTIVE" },
  { definitionId: "7", configCode: "KPC-054-01", kpiCode: "KPI-054", name: "Fleet availability", category: "Operations", goal: "95%", measurementUnit: "%", dataSource: "GPS Integration", status: "ACTIVE" },
  { definitionId: "legacy:55", configCode: "KPC-055-01", kpiCode: "KPI-055", name: "Customer claim resolution", category: "Quality", goal: "48 hours", measurementUnit: "Hours", dataSource: "CRM", status: "INACTIVE" },
];

const hiddenKpisByPool = new Map<number, Set<string>>();

const importableKpis: PoolKpi[] = [
  { definitionId: "legacy:56", configCode: "KPC-056-01", kpiCode: "KPI-056", name: "Fuel efficiency per route", category: "Operations", goal: "8.5 km/L", measurementUnit: "km/L", dataSource: "GPS Integration", status: "ACTIVE" },
  { definitionId: "legacy:57", configCode: "KPC-057-01", kpiCode: "KPI-057", name: "Invoice collection cycle", category: "Financial", goal: "30 days", measurementUnit: "Days", dataSource: "SAP", status: "ACTIVE" },
  { definitionId: "legacy:59", configCode: "KPC-059-01", kpiCode: "KPI-059", name: "Preventive maintenance compliance", category: "Quality", goal: "98%", measurementUnit: "%", dataSource: "EMS", status: "ACTIVE" },
  { definitionId: "legacy:60", configCode: "KPC-060-01", kpiCode: "KPI-060", name: "Legacy fuel variance control", category: "Operations", goal: "5%", measurementUnit: "%", dataSource: "Legacy GPS", status: "INACTIVE" },
  { definitionId: "8", configCode: "KPC-061-01", kpiCode: "KPI-061", name: "Manual invoice exception rate", category: "Financial", goal: "2%", measurementUnit: "%", dataSource: "Excel Import", status: "INACTIVE" },
];

const sampleScorecards: PoolScorecard[] = [
  { code: "SCD-01", name: "EXA Operations ScoreCard", company: "EXA", duration: "Jan 2026 - Jun 2026", frequency: "Monthly", selectedKpis: "3/8", expectedInputs: 6, status: "ACTIVE" },
  { code: "SCD-02", name: "EXA Security ScoreCard", company: "EXA", duration: "Jan 2026 - Mar 2026", frequency: "Monthly", selectedKpis: "2/10", expectedInputs: 3, status: "ACTIVE" },
];

let pools: KpiPoolRecord[] = [
  { id: 1, code: "PL-OPS-SEG-01", name: "EXA Operations KPI Pool", companies: ["EXA", "CONMOXA"], frequency: "Monthly", validFrom: "2026-01-01", validTo: "2026-12-31", description: "Operational KPIs used across EXA and CONMOXA.", status: "ACTIVE", kpis: sampleKpis, scorecards: sampleScorecards },
  { id: 2, code: "PL-FIN-01", name: "Financial KPI Pool", companies: ["EXA"], frequency: "Monthly", validFrom: "2026-01-01", validTo: "2026-12-31", description: "Financial performance indicators for 2026.", status: "ACTIVE", kpis: sampleKpis.slice(0, 3), scorecards: sampleScorecards.slice(0, 1) },
  { id: 3, code: "PL-OPS-SEC-01", name: "EXA Security KPI Pool", companies: ["Grupo EXA"], frequency: "Monthly", validFrom: "2026-01-01", validTo: "2026-12-31", description: "Security and quality indicators.", status: "ACTIVE", kpis: sampleKpis.slice(2), scorecards: sampleScorecards },
  { id: 4, code: "PL-OPS-SEC-02", name: "Operations Security 2025", companies: ["EXA"], frequency: "Monthly", validFrom: "2025-01-01", validTo: "2025-12-31", description: "Closed operational pool for 2025.", status: "INACTIVE", kpis: sampleKpis.slice(0, 2), scorecards: sampleScorecards.slice(0, 1) },
  { id: 5, code: "PL-LOG-H1-26", name: "Logistics Performance H1", companies: ["EXA"], frequency: "Monthly", validFrom: "2026-01-01", validTo: "2026-06-30", description: "First-semester logistics and delivery performance indicators.", status: "ACTIVE", kpis: kpiCatalog.slice(1, 7), scorecards: [{ ...sampleScorecards[0], code: "SCD-LOG-H1", name: "Logistics H1 ScoreCard", duration: "Jan 2026 - Jun 2026", selectedKpis: "6/6" }] },
  { id: 6, code: "PL-MNT-H2-26", name: "Fleet Maintenance H2", companies: ["CONMOXA"], frequency: "Monthly", validFrom: "2026-07-01", validTo: "2026-12-31", description: "Second-semester fleet availability and preventive maintenance KPIs.", status: "ACTIVE", kpis: kpiCatalog.slice(3, 8), scorecards: [{ ...sampleScorecards[0], code: "SCD-MNT-H2", name: "Fleet Maintenance H2", company: "CONMOXA", duration: "Jul 2026 - Dec 2026", selectedKpis: "5/5" }] },
  { id: 7, code: "PL-COM-AN-26", name: "Commercial Annual Pool", companies: ["EXA", "Grupo EXA"], frequency: "Monthly", validFrom: "2026-01-01", validTo: "2026-12-31", description: "Annual commercial growth, sales, and customer indicators.", status: "ACTIVE", kpis: kpiCatalog.slice(0, 6), scorecards: [] },
  { id: 8, code: "PL-HR-H1-26", name: "People & Culture H1", companies: ["Grupo EXA"], frequency: "Quarterly", validFrom: "2026-01-01", validTo: "2026-06-30", description: "People, training, and retention indicators for the first half of 2026.", status: "ACTIVE", kpis: kpiCatalog.slice(4, 8), scorecards: [{ ...sampleScorecards[1], code: "SCD-HR-H1", name: "People & Culture H1", company: "Grupo EXA", duration: "Jan 2026 - Jun 2026", frequency: "Quarterly", selectedKpis: "4/4", expectedInputs: 2 }] },
  { id: 9, code: "PL-CX-H2-26", name: "Customer Experience H2", companies: ["EXA"], frequency: "Monthly", validFrom: "2026-07-01", validTo: "2026-12-31", description: "Customer service quality and claim-resolution indicators.", status: "ACTIVE", kpis: kpiCatalog.slice(2, 7), scorecards: [] },
  { id: 10, code: "PL-COMP-26", name: "Compliance Annual Pool", companies: ["EXA", "CONMOXA", "Grupo EXA"], frequency: "Quarterly", validFrom: "2026-01-01", validTo: "2026-12-31", description: "Annual safety, compliance, and governance indicators.", status: "ACTIVE", kpis: kpiCatalog.slice(2), scorecards: [{ ...sampleScorecards[1], code: "SCD-COMP-26", name: "Corporate Compliance", company: "Grupo EXA", duration: "Jan 2026 - Dec 2026", frequency: "Quarterly", selectedKpis: "6/6", expectedInputs: 4 }] },
  { id: 11, code: "PL-FIN-H1-25", name: "Finance H1 Historical", companies: ["EXA"], frequency: "Monthly", validFrom: "2025-01-01", validTo: "2025-06-30", description: "Historical six-month financial pool retained for consultation.", status: "INACTIVE", kpis: sampleKpis.slice(0, 3), scorecards: [] },
  { id: 12, code: "PL-OPS-MAY-SEP", name: "Operations Seasonal Pool", companies: ["CONMOXA"], frequency: "Monthly", validFrom: "2026-05-01", validTo: "2026-09-30", description: "Seasonal operational KPIs used during the May-to-September peak period.", status: "ACTIVE", kpis: kpiCatalog.slice(1, 5), scorecards: [{ ...sampleScorecards[0], code: "SCD-SEA-26", name: "Peak Season Operations", company: "CONMOXA", duration: "May 2026 - Sep 2026", selectedKpis: "4/4", expectedInputs: 5 }] },
];

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 180));
const clone = (pool: KpiPoolRecord): KpiPoolRecord => ({
  ...pool,
  companies: [...pool.companies],
  kpis: pool.kpis.map((kpi) => ({ ...kpi })),
  scorecards: pool.scorecards.map((scorecard) => ({ ...scorecard })),
});

export const kpiPoolService = {
  async list() {
    const response = await this.listPage({ page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" });
    return response.data;
  },
  async listPage(params: PoolListParams) {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), sortBy: params.sortBy, sortOrder: params.sortOrder });
    if (params.search) query.set("search", params.search);
    params.status?.forEach((value) => query.append("status", value));
    params.companyId?.forEach((value) => query.append("companyId", value));
    params.inputFrequencyId?.forEach((value) => query.append("inputFrequencyId", value));
    params.issueYear?.forEach((value) => query.append("issueYear", value));
    const response = await poolApiRequest<PoolListResponse>(`/v1/kpi-pools?${query}`);
    return { ...response, data: response.data.map((value) => clone(cachePool(fromApi(value)))) };
  },
  async get(id: number) {
    const response = await poolApiRequest<{ data: PoolApiRecord }>(`/v1/kpi-pools/${id}`);
    const pool = fromApi(response.data);
    const periods = await this.getInputPeriods(id);
    const manageable = periods.meta.defaultPeriodStart ? await this.getManageableKpis(id, periods.meta.defaultPeriodStart) : [];
    pool.kpis = manageable.filter((item) => item.availability === "IN_POOL").map(({ availability: _availability, reasonCode: _reasonCode, ...item }) => item);
    return clone(cachePool(pool));
  },
  async save(input: KpiPoolInput, id?: number) {
    const body = JSON.stringify({
      poolName: input.name, poolAreaIds: input.poolAreaIds, companyIds: input.companyIds,
      inputFrequencyId: input.inputFrequencyId, validFrom: input.validFrom, validTo: input.validTo,
      description: input.description || null,
    });
    const response = await poolApiRequest<{ data: PoolApiRecord }>(id ? `/v1/kpi-pools/${id}` : "/v1/kpi-pools", { method: id ? "PATCH" : "POST", body });
    return clone(cachePool(fromApi(response.data)));
  },
  async lookups() { return poolApiRequest<{ data: PoolLookups }>("/v1/kpi-pools/lookups").then((response) => response.data); },
  async deactivate(id: number) {
    return poolApiRequest(`/v1/kpi-pools/${id}/deactivate`, { method: "POST" });
  },
  async activationReadiness(id: number) {
    return poolApiRequest<{ data: { poolId: string; status: string; ready: boolean; checks: Array<{ code: string; passed: boolean; message: string }> } }>(`/v1/kpi-pools/${id}/activation-readiness`).then((response) => response.data);
  },
  async activate(id: number) {
    return poolApiRequest(`/v1/kpi-pools/${id}/activate`, { method: "POST" });
  },
  async getManageableKpis(poolId: number, periodStart?: string): Promise<ManageablePoolKpi[]> {
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    if (periodStart) query.set("periodStart", periodStart);
    const response = await poolApiRequest<{ data: AvailabilityApiRecord[] }>(`/v1/kpi-pools/${poolId}/available-kpi-configurations?${query}`);
    return response.data.map((value) => ({
      configurationId: value.id, definitionId: value.definitionId, configCode: value.configCode,
      kpiCode: value.definitionCode, name: value.definitionName, category: value.categoryName,
      goal: value.goal ?? "—", measurementUnit: value.measurementUnit, dataSource: value.dataSource,
      status: value.isActive ? "ACTIVE" : "INACTIVE",
      availability: value.availability === "AVAILABLE_TO_ADD" ? "AVAILABLE" : value.availability === "ALREADY_IN_POOL" ? "IN_POOL" : "NOT_AVAILABLE",
      reasonCode: value.reasonCode,
      conflictingConfigurationCode: value.conflictingConfigurationCode ?? null,
    }));
  },
  async getInputPeriods(poolId: number) { return poolApiRequest<PoolInputPeriods>(`/v1/kpi-pools/${poolId}/input-periods`); },
  async finalizePeriodComposition(poolId: number, periodStart: string) {
    return poolApiRequest<{ data: { poolId: string; periodStart: string; periodEnd: string; status: "POOL_COMPOSITION_LOCKED"; kpiCount: number } }>(`/v1/kpi-pools/${poolId}/input-periods/finalize`, { method: "POST", body: JSON.stringify({ periodStart }) });
  },
  async getComposition(poolId: number, periodStart: string): Promise<PoolKpi[]> {
    const response = await poolApiRequest<{ data: MembershipApiRecord[] }>(`/v1/kpi-pools/${poolId}/kpi-configurations?periodStart=${encodeURIComponent(periodStart)}`);
    return response.data.map((value) => ({
      configurationId: value.configurationId,
      definitionId: value.definitionId,
      configCode: value.configCode,
      kpiCode: value.definitionCode,
      name: value.definitionName,
      category: value.categoryName ?? "Not specified",
      goal: value.goal ?? "Not specified",
      measurementUnit: value.measurementUnit ?? "Not specified",
      dataSource: value.dataSource ?? "Not specified",
      status: value.isActive ? "ACTIVE" : "INACTIVE",
    }));
  },
  async getManageableComposition(poolId: number, periodStart: string): Promise<ManageablePoolKpi[]> {
    return (await this.getComposition(poolId, periodStart)).map((kpi) => ({ ...kpi, availability: "IN_POOL", reasonCode: "POOL_PERIOD_LOCKED", conflictingConfigurationCode: null }));
  },
  async getConfigurationUsage(configurationIds: string[]) {
    if (!configurationIds.length) return [];
    const response = await poolApiRequest<{ data: Array<{ configurationId: string; usedIn: number; pools: Array<{ id: string; code: string; name: string; status: string }> }> }>("/v1/kpi-pools/kpi-configuration-usage", { method: "POST", body: JSON.stringify({ configurationIds }) });
    return response.data;
  },
  async getImportableKpis(search: string, recentOnly = false) {
    await wait();
    const existing = new Set(kpiCatalog.map((kpi) => kpi.configCode));
    const term = search.trim().toLowerCase();
    if (!term && !recentOnly) return [];
    const matches = importableKpis
      .filter((kpi) => !existing.has(kpi.configCode))
      .filter((kpi) => !term || `${kpi.configCode} ${kpi.kpiCode} ${kpi.name} ${kpi.category} ${kpi.dataSource}`.toLowerCase().includes(term));
    return (recentOnly && !term ? [...matches].reverse().slice(0, 5) : matches).map((kpi) => ({ ...kpi }));
  },
  async getConfigurationDetailByCode(configCode: string): Promise<KpiConfigRecord> {
    await wait();
    const kpi = [...kpiCatalog, ...importableKpis].find((item) => item.configCode === configCode);
    if (!kpi) throw new Error("KPI Configuration not found.");
    const usedBy = pools.filter((pool) => pool.kpis.some((item) => item.configCode === configCode));
    const numericGoal = Number(kpi.goal.replace(/[^0-9.-]/g, "")) || 0;
    return {
      id: Number(kpi.configCode.replace(/\D/g, "")) || 0,
      code: kpi.configCode,
      definitionId: kpi.definitionId,
      definitionCode: kpi.kpiCode,
      definitionName: kpi.name,
      goal: numericGoal,
      measurementUnit: kpi.measurementUnit,
      evaluationType: "Higher is better",
      dataSource: kpi.dataSource,
      ranges: { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
      usedIn: usedBy.length,
      status: kpi.status === "ACTIVE" ? "CONFIGURED" : "INACTIVE",
      createdAt: "2026-01-15T09:00:00",
      createdBy: "KPI Management",
      updatedAt: "2026-07-30T09:00:00",
      updatedBy: "KPI Management",
      poolNames: usedBy.map((pool) => pool.name),
    };
  },
  async getScorecardDetailByCode(scorecardCode: string): Promise<ScorecardRecord> {
    await wait();
    const owningPool = pools.find((pool) => pool.scorecards.some((item) => item.code === scorecardCode));
    const scorecard = owningPool?.scorecards.find((item) => item.code === scorecardCode);
    if (!scorecard || !owningPool) throw new Error("ScoreCard not found.");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const durationParts = scorecard.duration.match(/^([A-Za-z]{3})\s+(\d{4})\s+-\s+([A-Za-z]{3})\s+(\d{4})$/);
    const startMonth = durationParts ? monthNames.indexOf(durationParts[1]) : 0;
    const endMonth = durationParts ? monthNames.indexOf(durationParts[3]) : 11;
    const year = durationParts ? Number(durationParts[2]) : new Date().getFullYear();
    const durationMonths = Array.from(
      { length: Math.max(1, endMonth - startMonth + 1) },
      (_, index) => startMonth + index,
    );
    return {
      id: Number(scorecard.code.replace(/\D/g, "")) || 0,
      code: scorecard.code,
      name: scorecard.name,
      departments: ["Operations"],
      durationMonths,
      year,
      inputFrequency: scorecard.frequency,
      kpis: Number(scorecard.selectedKpis.split("/")[1]) || 0,
      linkedScorecards: 0,
      poolSource: owningPool.name,
      company: scorecard.company,
      status: scorecard.status === "ACTIVE" ? "ACTIVE" : "EXPIRED",
      collaborators: 0,
    };
  },
  async importKpis(configCodes: string[]) {
    await wait();
    const imported = importableKpis.filter((item) => configCodes.includes(item.configCode));
    if (!imported.length) throw new Error("KPI Configurations not found.");
    const existing = new Set(kpiCatalog.map((item) => item.configCode));
    kpiCatalog = [...kpiCatalog, ...imported.filter((item) => !existing.has(item.configCode)).map((item) => ({ ...item }))];
    return imported.map((item) => ({ ...item }));
  },
  async addKpis(poolId: number, configCodes: string[], periodStart?: string) {
    const catalog = await this.getManageableKpis(poolId, periodStart);
    const configurationIds = catalog.filter((item) => configCodes.includes(item.configCode)).map((item) => item.configurationId!).filter(Boolean);
    if (configurationIds.length !== configCodes.length) throw new Error("One or more KPI Configurations were not found.");
    return poolApiRequest(`/v1/kpi-pools/${poolId}/kpi-configurations`, { method: "POST", body: JSON.stringify({ configurationIds, effectiveFromPeriod: periodStart }) });
  },
  async addConfigurations(poolId: number, configurations: KpiConfigRecord[]) {
    await wait();
    const pool = pools.find((item) => item.id === poolId);
    if (!pool) throw new Error("KPI Pool not found.");

    const eligible = configurations.filter((config) => config.status === "CONFIGURED");
    const incoming: PoolKpi[] = eligible.map((config) => ({
      definitionId: String(config.definitionId),
      configCode: config.code,
      kpiCode: config.definitionCode,
      name: config.definitionName,
      category: "General",
      goal: `${config.goal}`,
      measurementUnit: config.measurementUnit,
      dataSource: config.dataSource,
      status: "ACTIVE",
    }));
    const currentCodes = new Set(pool.kpis.map((kpi) => kpi.configCode));
    const additions = incoming.filter((kpi) => !currentCodes.has(kpi.configCode));
    assertUniqueDefinitions(pool, additions);
    const catalogCodes = new Set(kpiCatalog.map((kpi) => kpi.configCode));
    kpiCatalog = [
      ...kpiCatalog,
      ...incoming.filter((kpi) => !catalogCodes.has(kpi.configCode)).map((kpi) => ({ ...kpi })),
    ];
    pool.kpis = [...pool.kpis, ...additions.map((kpi) => ({ ...kpi }))];
    return { pool: clone(pool), addedCount: additions.length };
  },
  async removeKpis(poolId: number, configCodes: string[], periodStart?: string, poolStatus?: "DRAFT" | "ACTIVE" | "INACTIVE") {
    const query = periodStart ? `?periodStart=${encodeURIComponent(periodStart)}` : "";
    const memberships = await poolApiRequest<{ data: MembershipApiRecord[] }>(`/v1/kpi-pools/${poolId}/kpi-configurations${query}`);
    const selected = memberships.data.filter((item) => configCodes.includes(item.configCode));
    if (selected.length !== configCodes.length) throw new Error("One or more memberships were not found.");
    await Promise.all(selected.map((item) => poolApiRequest(
      poolStatus === "ACTIVE" ? `/v1/kpi-pools/${poolId}/kpi-configurations/${item.configurationId}/retire` : `/v1/kpi-pools/${poolId}/kpi-configurations/${item.configurationId}`,
      poolStatus === "ACTIVE" ? { method: "POST", body: JSON.stringify({ effectiveFromPeriod: periodStart }) } : { method: "DELETE" },
    )));
    return { removed: selected.length };
  },
  async hideKpisFromPool(poolId: number, configCodes: string[]) {
    await wait();
    const pool = pools.find((item) => item.id === poolId);
    if (!pool) throw new Error("KPI Pool not found.");
    const hidden = hiddenKpisByPool.get(poolId) ?? new Set<string>();
    configCodes.forEach((code) => hidden.add(code));
    hiddenKpisByPool.set(poolId, hidden);
    pool.kpis = pool.kpis.filter((kpi) => !hidden.has(kpi.configCode));
    return clone(pool);
  },
  async softDeleteKpi(configCode: string) {
    await wait();
    const current = kpiCatalog.find((kpi) => kpi.configCode === configCode);
    if (!current) throw new Error("KPI Configuration not found.");
    kpiCatalog = kpiCatalog.map((kpi) => kpi.configCode === configCode ? { ...kpi, status: "INACTIVE" } : kpi);
    pools = pools.map((pool) => ({ ...pool, kpis: pool.kpis.filter((kpi) => kpi.configCode !== configCode) }));
    return { ...current, status: "INACTIVE" as const };
  },
};

function assertUniqueDefinitions(pool: KpiPoolRecord, additions: PoolKpi[]) {
  const assignedDefinitionIds = new Set(pool.kpis.map((kpi) => kpi.definitionId));
  for (const addition of additions) {
    if (assignedDefinitionIds.has(addition.definitionId)) {
      throw new Error(`KPI_DEFINITION_ALREADY_ASSIGNED: ${addition.kpiCode} is already represented in this Pool.`);
    }
    assignedDefinitionIds.add(addition.definitionId);
  }
}

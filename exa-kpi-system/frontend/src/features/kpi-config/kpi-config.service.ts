import type { KpiConfigInput, KpiConfigRecord } from "./kpi-config.types";
import { kpiResults } from "../monitoring-results/monitoring-results.data";
import { apiRequest } from "../../api/http-client";

let configurations: KpiConfigRecord[] = [
  {
    id: 1,
    code: "KPC-049-01",
    definitionId: 49,
    definitionCode: "KPI-049",
    definitionName: "Productividad kms/cabezal",
    goal: 3700,
    measurementUnit: "km",
    evaluationType: "Higher is better",
    dataSource: "GPS",
    ranges: { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
    usedIn: 2,
    status: "CONFIGURED",
    createdAt: "2026-01-18T08:35:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-06-12T14:20:00",
    updatedBy: "Ana Martinez",
    poolNames: ["Pool Operaciones EXA 2026", "Pool Productividad Grupo EXA"],
  },
  {
    id: 2,
    code: "KPC-049-02",
    definitionId: 49,
    definitionCode: "KPI-049",
    definitionName: "Productividad kms/cabezal",
    goal: 4000,
    measurementUnit: "km",
    evaluationType: "Higher is better",
    dataSource: "EMS",
    ranges: { redFrom: 0, redTo: 59, yellowFrom: 60, yellowTo: 79, greenFrom: 80, greenTo: 100 },
    usedIn: 3,
    status: "CONFIGURED",
    createdAt: "2026-02-04T10:15:00",
    createdBy: "Ana Martinez",
    updatedAt: "2026-07-03T09:42:00",
    updatedBy: "Carlos Gomez",
    poolNames: ["Pool Operaciones EXA 2026", "Pool Transporte Regional", "Pool Productividad Grupo EXA"],
  },
  {
    id: 3,
    code: "KPC-050-01",
    definitionId: 50,
    definitionCode: "KPI-050",
    definitionName: "Daños en transporte",
    goal: 0,
    measurementUnit: "Incidents",
    evaluationType: "Lower is better",
    dataSource: "Manual Entry",
    ranges: { redFrom: 0, redTo: 30, yellowFrom: 31, yellowTo: 65, greenFrom: 66, greenTo: 100 },
    usedIn: 1,
    status: "CONFIGURED",
    createdAt: "2026-03-09T11:50:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-05-18T16:10:00",
    updatedBy: "Carlos Gomez",
    poolNames: ["Pool Seguridad y Transporte 2026"],
  },
];

configurations = [
  ...kpiResults.map((kpi): KpiConfigRecord => {
    const definitionId = Number(kpi.code.replace(/\D/g, ""));
    const numericGoal = Number(kpi.goal.replace(/[^0-9.-]/g, "")) || 0;
    const lowerIsBetter = /(reduce|damage|cost|time|claim|emission|error|variance)/i.test(kpi.name);
    return {
      id: 1000 + definitionId,
      code: `KPC-${String(definitionId).padStart(3, "0")}-01`,
      definitionId,
      definitionCode: kpi.code,
      definitionName: kpi.name,
      goal: numericGoal,
      measurementUnit: kpi.unit,
      evaluationType: lowerIsBetter ? "Lower is better" : "Higher is better",
      dataSource: kpi.dataSource,
      ranges: lowerIsBetter
        ? { redFrom: 0, redTo: 30, yellowFrom: 31, yellowTo: 65, greenFrom: 66, greenTo: 100 }
        : { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
      usedIn: 1 + (definitionId % 3),
      status: "CONFIGURED",
      createdAt: "2026-01-15T09:00:00",
      createdBy: "Carlos Gomez",
      updatedAt: "2026-08-01T12:00:00",
      updatedBy: "Carlos Gomez",
      poolNames: ["KPI Pool Operations EXA"],
    };
  }),
];

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 220));

const determineEvaluationType = (name: string) => {
  const normalizedName = name.toLowerCase();
  return /(daño|incidente|costo|tiempo|error|reduc)/.test(normalizedName)
    ? "Lower is better"
    : "Higher is better";
};

export const kpiConfigMockService = {
  async list() {
    await wait();
    return configurations.map((config) => ({ ...config, ranges: { ...config.ranges } }));
  },

  async getDetail(id: number) {
    await wait();
    const config = configurations.find((item) => item.id === id);
    if (!config) throw new Error("KPI Configuration not found.");
    return { ...config, ranges: { ...config.ranges }, poolNames: [...config.poolNames] };
  },

  async create(
    input: KpiConfigInput,
    definition: { code: string; name: string },
  ) {
    await wait();
    const nextId = Math.max(0, ...configurations.map((config) => config.id)) + 1;
    const created: KpiConfigRecord = {
      ...input,
      evaluationType: determineEvaluationType(definition.name),
      id: nextId,
      code: `KPC-${String(input.definitionId).padStart(3, "0")}-${String(nextId).padStart(3, "0")}`,
      definitionCode: definition.code,
      definitionName: definition.name,
      usedIn: 0,
      status: "CONFIGURED",
      createdAt: new Date().toISOString(),
      createdBy: "Carlos Gomez",
      updatedAt: new Date().toISOString(),
      updatedBy: "Carlos Gomez",
      poolNames: [],
    };
    configurations = [created, ...configurations];
    return created;
  },

  async update(
    id: number,
    input: KpiConfigInput,
    definition: { code: string; name: string },
  ) {
    await wait();
    const current = configurations.find((config) => config.id === id);
    if (!current) throw new Error("KPI Configuration not found.");
    const updated: KpiConfigRecord = {
      ...current,
      ...input,
      definitionCode: definition.code,
      definitionName: definition.name,
      evaluationType: determineEvaluationType(definition.name),
      updatedAt: new Date().toISOString(),
      updatedBy: "Carlos Gomez",
    };
    configurations = configurations.map((config) => config.id === id ? updated : config);
    return { ...updated, ranges: { ...updated.ranges }, poolNames: [...updated.poolNames] };
  },

  async deactivate(id: number) {
    await wait();
    const current = configurations.find((config) => config.id === id);
    if (!current) throw new Error("KPI Configuration not found.");
    const updated: KpiConfigRecord = {
      ...current,
      status: "INACTIVE",
      updatedAt: new Date().toISOString(),
      updatedBy: "Carlos Gomez",
    };
    configurations = configurations.map((config) => config.id === id ? updated : config);
    return { ...updated, ranges: { ...updated.ranges }, poolNames: [...updated.poolNames] };
  },

  async markAssignedToPool(ids: number[], poolName: string) {
    await wait();
    const selectedIds = new Set(ids);
    configurations = configurations.map((config) => {
      if (!selectedIds.has(config.id) || config.poolNames.includes(poolName)) return config;
      const poolNames = [...config.poolNames, poolName];
      return {
        ...config,
        poolNames,
        usedIn: poolNames.length,
        updatedAt: new Date().toISOString(),
        updatedBy: "Carlos Gomez",
      };
    });
  },
};

const envelope = <T>(path: string, init?: RequestInit) => apiRequest<{ data: T }>(path, init).then((response) => response.data);

export const kpiConfigService = {
  async list(): Promise<KpiConfigRecord[]> {
    const response = await apiRequest<{ data: KpiConfigRecord[] }>("/v1/kpi-configurations?page=1&pageSize=100");
    return response.data;
  },
  getDetail(id: number) { return envelope<KpiConfigRecord>(`/v1/kpi-configurations/${id}`); },
  create(input: KpiConfigInput, _definition: { code: string; name: string }) {
    return envelope<KpiConfigRecord>("/v1/kpi-configurations", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: number, input: KpiConfigInput, _definition: { code: string; name: string }) {
    return envelope<KpiConfigRecord>(`/v1/kpi-configurations/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deactivate(id: number) { return envelope<KpiConfigRecord>(`/v1/kpi-configurations/${id}/deactivate`, { method: "PATCH" }); },
  softDelete(id: number) { return envelope<KpiConfigRecord>(`/v1/kpi-configurations/${id}`, { method: "DELETE" }); },
  markAssignedToPool(ids: number[], poolName: string) {
    // Transitional compatibility for KPI Pool, which remains mock-backed.
    return kpiConfigMockService.markAssignedToPool(ids, poolName);
  },
};

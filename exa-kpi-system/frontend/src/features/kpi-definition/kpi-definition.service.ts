import type {
  KpiConfigUsage,
  KpiDefinition,
  KpiDefinitionInput,
} from "./kpi-definition.types";
import { kpiResults } from "../monitoring-results/monitoring-results.data";

const initialDefinitions: KpiDefinition[] = [
  {
    id: 49,
    code: "KPI-049",
    name: "Productividad kms/cabezal",
    objective: "Medir la eficiencia operativa de los cabezales.",
    category: "Operations",
    status: "ACTIVE",
    createdAt: "2026-01-08T09:18:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-06-14T15:42:00",
    updatedBy: "Ana Martinez",
  },
  {
    id: 50,
    code: "KPI-050",
    name: "Daños en transporte",
    objective: "Medir y reducir los daños ocurridos durante el transporte.",
    category: "Security",
    status: "ACTIVE",
    createdAt: "2026-01-10T11:35:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-05-22T08:16:00",
    updatedBy: "Carlos Gomez",
  },
  {
    id: 51,
    code: "KPI-051",
    name: "Crecimiento de ventas del Grupo EXA",
    objective: "Medir el incremento de ventas respecto al período anterior.",
    category: "Financial",
    status: "ACTIVE",
    createdAt: "2026-02-03T10:05:00",
    createdBy: "Ana Martinez",
    updatedAt: "2026-07-18T13:27:00",
    updatedBy: "Carlos Gomez",
  },
  {
    id: 52,
    code: "KPI-052",
    name: "Reducción de costos operativos",
    objective: "Medir la eficiencia logística y el ahorro operativo.",
    category: "Financial",
    status: "INACTIVE",
    createdAt: "2025-11-12T14:20:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-04-02T09:40:00",
    updatedBy: "Ana Martinez",
  },
];

const inferCategory = (name: string, source: string) => {
  const value = `${name} ${source}`.toLowerCase();
  if (/(cost|sales|invoice|collection|financial)/.test(value)) return "Financial";
  if (/(safety|damage|compliance|incident)/.test(value)) return "Security";
  if (/(customer|claim|service)/.test(value)) return "Customer Service";
  if (/(training|employee|retention)/.test(value)) return "Human Resources";
  if (/(system|data|uptime)/.test(value)) return "Systems";
  return "Operations";
};

let definitions: KpiDefinition[] = [
  initialDefinitions.find((definition) => definition.id === 51)!,
  ...kpiResults.map((kpi): KpiDefinition => ({
    id: Number(kpi.code.replace(/\D/g, "")),
    code: kpi.code,
    name: kpi.name,
    objective: `Define and monitor ${kpi.name.toLowerCase()} consistently across assigned KPI Pools and ScoreCards.`,
    category: inferCategory(kpi.name, kpi.dataSource),
    status: "ACTIVE",
    createdAt: "2026-01-08T09:18:00",
    createdBy: "Carlos Gomez",
    updatedAt: "2026-08-01T12:00:00",
    updatedBy: "Carlos Gomez",
  })),
];

const configUsageByDefinition: Record<number, KpiConfigUsage[]> = {
  49: [
    { id: 1, code: "KPC-049-01", goal: 3700, measurementUnit: "km", evaluationType: "Higher is better", dataSource: "GPS", status: "CONFIGURED" },
    { id: 2, code: "KPC-049-02", goal: 4000, measurementUnit: "km", evaluationType: "Higher is better", dataSource: "EMS", status: "CONFIGURED" },
  ],
  50: [
    { id: 3, code: "KPC-050-01", goal: 0, measurementUnit: "Incidents", evaluationType: "Lower is better", dataSource: "Manual Entry", status: "CONFIGURED" },
  ],
  51: [
    { id: 4, code: "KPC-051-01", goal: 10, measurementUnit: "%", evaluationType: "Higher is better", dataSource: "SAP", status: "CONFIGURED" },
    { id: 5, code: "KPC-051-02", goal: 8, measurementUnit: "%", evaluationType: "Higher is better", dataSource: "Excel Import", status: "INCOMPLETE" },
  ],
};

kpiResults.forEach((kpi) => {
  const definitionId = Number(kpi.code.replace(/\D/g, ""));
  const lowerIsBetter = /(reduce|damage|cost|time|claim|emission|error|variance)/i.test(kpi.name);
  configUsageByDefinition[definitionId] = [{
    id: 1000 + definitionId,
    code: `KPC-${String(definitionId).padStart(3, "0")}-01`,
    goal: Number(kpi.goal.replace(/[^0-9.-]/g, "")) || 0,
    measurementUnit: kpi.unit,
    evaluationType: lowerIsBetter ? "Lower is better" : "Higher is better",
    dataSource: kpi.dataSource,
    status: "CONFIGURED",
  }];
});

const wait = (milliseconds = 250) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const kpiDefinitionService = {
  async list(): Promise<KpiDefinition[]> {
    await wait();
    return definitions.map((definition) => ({ ...definition }));
  },

  async getDetail(id: number): Promise<{
    definition: KpiDefinition;
    configurations: KpiConfigUsage[];
  }> {
    await wait();
    const definition = definitions.find((item) => item.id === id);
    if (!definition) throw new Error("KPI Definition not found.");
    return {
      definition: { ...definition },
      configurations: (configUsageByDefinition[id] ?? []).map((item) => ({ ...item })),
    };
  },

  async create(input: KpiDefinitionInput): Promise<KpiDefinition> {
    await wait();
    const nextId =
      definitions.reduce((highest, definition) => Math.max(highest, definition.id), 0) + 1;
    const definition: KpiDefinition = {
      ...input,
      id: nextId,
      code: `KPI-${String(nextId).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      createdBy: "Carlos Gomez",
      updatedAt: new Date().toISOString(),
      updatedBy: "Carlos Gomez",
    };

    definitions = [definition, ...definitions];
    return { ...definition };
  },

  async update(id: number, input: KpiDefinitionInput): Promise<KpiDefinition> {
    await wait();
    const current = definitions.find((definition) => definition.id === id);

    if (!current) {
      throw new Error("KPI Definition not found.");
    }

    const updated = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: "Carlos Gomez",
    };
    definitions = definitions.map((definition) =>
      definition.id === id ? updated : definition,
    );
    return { ...updated };
  },

  async softDelete(id: number): Promise<void> {
    await wait();
    definitions = definitions.filter((definition) => definition.id !== id);
  },
};

export type InitialKpiCategory = { code: string; name: string };
export type InitialKpiDefinition = {
  kpiCode: string;
  kpiName: string;
  description: string;
  categoryCode: string;
  status: "ACTIVE" | "INACTIVE";
};

export const initialKpiCategories: InitialKpiCategory[] = [
  { code: "CUSTOMER_SERVICE", name: "Customer Service" },
  { code: "FINANCIAL", name: "Financial" },
  { code: "HUMAN_RESOURCES", name: "Human Resources" },
  { code: "OPERATIONS", name: "Operations" },
  { code: "SECURITY", name: "Security" },
  { code: "SYSTEMS", name: "Systems" },
];

const inferCategoryCode = (name: string, source: string): string => {
  const value = `${name} ${source}`.toLowerCase();
  if (/(cost|sales|invoice|collection|financial)/.test(value)) return "FINANCIAL";
  if (/(safety|damage|compliance|incident)/.test(value)) return "SECURITY";
  if (/(customer|claim|service)/.test(value)) return "CUSTOMER_SERVICE";
  if (/(training|employee|retention)/.test(value)) return "HUMAN_RESOURCES";
  if (/(system|data|uptime)/.test(value)) return "SYSTEMS";
  return "OPERATIONS";
};

const monitoringDefinitions = [
  ["KPI-049", "Reduce operating costs", "Integrator - EMS"],
  ["KPI-050", "Productivity kms/head", "Integrator - EMS"],
  ["KPI-052", "Transportation damages", "EMS-Depot"],
  ["KPI-053", "Gensets sales", "Integrator - EMS"],
  ["KPI-054", "Increase EXA trips", "EMS"],
  ["KPI-061", "On-time dispatch rate", "TMS"],
] as const;

const generatedKpiNames = [
  "Fleet availability", "Preventive maintenance compliance", "Fuel efficiency", "Empty mileage reduction",
  "Container turnaround time", "Customer claim resolution", "Invoice accuracy", "Collection effectiveness",
  "Driver safety compliance", "Warehouse occupancy", "Order fulfillment rate", "Delivery lead time",
  "Route plan adherence", "Vehicle utilization", "Cost per kilometer", "Supplier service level",
  "Inventory record accuracy", "Training plan completion", "Employee retention", "System uptime",
  "Data quality compliance", "Carbon emissions intensity",
] as const;

const generatedDefinitions = Array.from({ length: 44 }, (_, index) => {
  const name = generatedKpiNames[index % generatedKpiNames.length];
  return [
    `KPI-${String(index + 62).padStart(3, "0")}`,
    index >= generatedKpiNames.length ? `${name} - Regional` : name,
    index % 3 === 0 ? "Integrator - EMS" : index % 3 === 1 ? "TMS" : "Operational Template",
  ] as const;
});

export const initialKpiDefinitions: InitialKpiDefinition[] = [
  {
    kpiCode: "KPI-051",
    kpiName: "Crecimiento de ventas del Grupo EXA",
    description: "Medir el incremento de ventas respecto al período anterior.",
    categoryCode: "FINANCIAL",
    status: "ACTIVE",
  },
  ...[...monitoringDefinitions, ...generatedDefinitions].map(([kpiCode, kpiName, source]) => ({
    kpiCode,
    kpiName,
    description: `Define and monitor ${kpiName.toLowerCase()} consistently across assigned KPI Pools and ScoreCards.`,
    categoryCode: inferCategoryCode(kpiName, source),
    status: "ACTIVE" as const,
  })),
];

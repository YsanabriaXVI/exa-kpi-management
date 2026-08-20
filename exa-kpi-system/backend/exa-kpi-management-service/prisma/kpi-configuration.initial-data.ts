export type InitialKpiConfiguration = {
  definitionCode: string; configCode: string; goal: number; measurementUnit: string;
  evaluationType: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER"; dataSource: string;
  ranges: { redFrom: number; redTo: number; yellowFrom: number; yellowTo: number; greenFrom: number; greenTo: number };
  status: "CONFIGURED";
};

const base = [
  { code: "KPI-049", name: "Reduce operating costs", unit: "%", dataSource: "Integrator - EMS", goal: "Reduce 20%" },
  { code: "KPI-050", name: "Productivity kms/head", unit: "kms", dataSource: "Integrator - EMS", goal: "3,700 kms" },
  { code: "KPI-052", name: "Transportation damages", unit: "count", dataSource: "EMS-Depot", goal: "0 damages" },
  { code: "KPI-053", name: "Gensets sales", unit: "%", dataSource: "Integrator - EMS", goal: "+5%" },
  { code: "KPI-054", name: "Increase EXA trips", unit: "count", dataSource: "EMS", goal: "+100" },
  { code: "KPI-061", name: "On-time dispatch rate", unit: "%", dataSource: "TMS", goal: "95%" },
] as const;

const names = ["Fleet availability", "Preventive maintenance compliance", "Fuel efficiency", "Empty mileage reduction", "Container turnaround time", "Customer claim resolution", "Invoice accuracy", "Collection effectiveness", "Driver safety compliance", "Warehouse occupancy", "Order fulfillment rate", "Delivery lead time", "Route plan adherence", "Vehicle utilization", "Cost per kilometer", "Supplier service level", "Inventory record accuracy", "Training plan completion", "Employee retention", "System uptime", "Data quality compliance", "Carbon emissions intensity"] as const;
const generated = Array.from({ length: 44 }, (_, index) => ({
  code: `KPI-${String(index + 62).padStart(3, "0")}`,
  name: index >= names.length ? `${names[index % names.length]} - Regional` : names[index % names.length],
  unit: index % 4 !== 2 ? "%" : index % 2 ? "hours" : "count",
  dataSource: index % 3 === 0 ? "Integrator - EMS" : index % 3 === 1 ? "TMS" : "Operational Template",
  goal: index % 4 !== 2 ? `${88 + index % 10}%` : `${4 + index % 8}`,
}));

const lower = (name: string) => /(reduce|damage|cost|time|claim|emission|error|variance)/i.test(name);
export const initialKpiConfigurations: InitialKpiConfiguration[] = [
  ...[...base, ...generated].map((item) => {
    const number = item.code.replace(/\D/g, "");
    const isLower = lower(item.name);
    return {
      definitionCode: item.code, configCode: `KPC-${number}-01`,
      goal: Number(item.goal.replace(/[^0-9.-]/g, "")) || 0,
      measurementUnit: item.unit, evaluationType: isLower ? "LOWER_IS_BETTER" as const : "HIGHER_IS_BETTER" as const,
      dataSource: item.dataSource,
      // Evaluation direction affects calculation, never the score/compliance color order.
      ranges: isLower ? { redFrom: 0, redTo: 30, yellowFrom: 31, yellowTo: 65, greenFrom: 66, greenTo: 100 } : { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
      status: "CONFIGURED" as const,
    };
  }),
];

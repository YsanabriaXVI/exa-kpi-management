export type MonitoringStatus = "ACTIVE" | "CONTINUE_ENTRY" | "SUBMITTED" | "VALIDATED" | "VALIDATED_WITH_WARNINGS" | "CLOSED" | "LOCKED";

export type MonitoringPool = {
  id: number;
  code: string;
  name: string;
  companies: string[];
  duration: string;
  frequency: string;
  currentPeriod: string;
  generatedInputs: number;
  closedInputs: number;
  kpiLines: number;
  resultsEntered: number;
  missing: number;
  status: MonitoringStatus;
};

export type InputPeriod = {
  id: number;
  shortLabel: string;
  period: string;
  kpiLines: number;
  entered: number | null;
  missing: number | null;
  validation: "No Errors" | "With Warnings" | "Pending Validation" | "Locked";
  status: "Closed" | "Closed with Exceptions" | "Validated" | "Continue Entry" | "Locked";
  closedAt: string;
};

const monthlyPeriodLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const majorIncidentPeriods: MonitoringPool[] = monthlyPeriodLabels.map((month, index) => {
  const future = index >= 8;
  const current = index === 7;
  return {
    id: 200 + index,
    code: "OPS-SEG-01",
    name: "Major Incident Zero",
    companies: ["EXA Group"],
    duration: "Jan - Dec 2026",
    frequency: "Monthly",
    currentPeriod: `${month} 2026`,
    generatedInputs: 12,
    closedInputs: future ? 7 : current ? 7 : index + 1,
    kpiLines: 1,
    resultsEntered: future || current ? 0 : 1,
    missing: future || current ? 1 : 0,
    status: future ? "LOCKED" : current ? "ACTIVE" : "CLOSED",
  };
});

const commercialPerformancePeriods: MonitoringPool[] = monthlyPeriodLabels.map((month, index) => {
  const future = index >= 8;
  const current = index === 7;
  const july = index === 6;
  return {
    id: 300 + index,
    code: "POOL-COM-01",
    name: "Commercial Performance",
    companies: ["EXA"],
    duration: "Jan - Dec 2026",
    frequency: "Monthly",
    currentPeriod: `${month} 2026`,
    generatedInputs: 12,
    closedInputs: future || current || july ? 6 : index + 1,
    kpiLines: 24,
    resultsEntered: future || current ? 0 : july ? 16 : 24,
    missing: future || current ? 24 : july ? 8 : 0,
    status: future ? "LOCKED" : current ? "ACTIVE" : july ? "CONTINUE_ENTRY" : "CLOSED",
  };
});

const safetyPoolPeriods: MonitoringPool[] = monthlyPeriodLabels.slice(0, 6).map((month, index) => ({
  id: 400 + index,
  code: "POOL-SEG-01",
  name: "KPI Pool Safety",
  companies: ["CONMOXA", "EXA"],
  duration: "Jan - Jun 2026",
  frequency: "Monthly",
  currentPeriod: `${month} 2026`,
  generatedInputs: 6,
  closedInputs: index < 4 ? index + 1 : 4,
  kpiLines: 30,
  resultsEntered: index < 4 ? 30 : index === 4 ? 27 : 30,
  missing: index < 4 ? 0 : index === 4 ? 3 : 0,
  status: index < 4 ? "CLOSED" : index === 4 ? "CONTINUE_ENTRY" : "VALIDATED",
}));

const financialPoolPeriods: MonitoringPool[] = monthlyPeriodLabels.slice(0, 6).map((month, index) => ({
  id: 500 + index,
  code: "POOL-FIN-01",
  name: "KPI Financial Pool",
  companies: ["EXA", "CONMOXA"],
  duration: "Jan - Jun 2026",
  frequency: "Monthly",
  currentPeriod: `${month} 2026`,
  generatedInputs: 6,
  closedInputs: index < 3 ? index + 1 : 3,
  kpiLines: 48,
  resultsEntered: index < 3 ? 48 : index === 3 ? 36 : index === 4 ? 48 : 46,
  missing: index < 3 ? 0 : index === 3 ? 12 : index === 4 ? 0 : 2,
  status: index < 3 ? "CLOSED" : index === 3 ? "CONTINUE_ENTRY" : index === 4 ? "SUBMITTED" : "VALIDATED_WITH_WARNINGS",
}));

export const monitoringPools: MonitoringPool[] = [
  ...majorIncidentPeriods,
  ...commercialPerformancePeriods,
  ...safetyPoolPeriods,
  ...financialPoolPeriods,
  { id: 101, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Jan 2026", generatedInputs: 9, closedInputs: 1, kpiLines: 50, resultsEntered: 50, missing: 0, status: "CLOSED" },
  { id: 102, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Feb 2026", generatedInputs: 9, closedInputs: 2, kpiLines: 50, resultsEntered: 50, missing: 0, status: "CLOSED" },
  { id: 103, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Mar 2026", generatedInputs: 9, closedInputs: 3, kpiLines: 50, resultsEntered: 49, missing: 1, status: "CLOSED" },
  { id: 104, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Apr 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 50, missing: 0, status: "CLOSED" },
  { id: 105, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "May 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 42, missing: 8, status: "CONTINUE_ENTRY" },
  { id: 106, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Jun 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 35, missing: 15, status: "CONTINUE_ENTRY" },
  { id: 107, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Jul 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 18, missing: 32, status: "CONTINUE_ENTRY" },
  { id: 108, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Aug 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 0, missing: 50, status: "ACTIVE" },
  { id: 109, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Sep 2026", generatedInputs: 9, closedInputs: 4, kpiLines: 50, resultsEntered: 0, missing: 50, status: "LOCKED" },
  { id: 1, code: "POOL-OPS-01", name: "KPI Pool Operations EXA", companies: ["EXA", "CONMOXA"], duration: "Jan - Dec 2026", frequency: "Monthly", currentPeriod: "Jun 2026", generatedInputs: 12, closedInputs: 4, kpiLines: 50, resultsEntered: 42, missing: 8, status: "CONTINUE_ENTRY" },
  { id: 5, code: "POOL-HR-01", name: "People & Culture KPIs", companies: ["EXA Group"], duration: "Q1 - Q4 2026", frequency: "Quarterly", currentPeriod: "Q2 2026", generatedInputs: 4, closedInputs: 1, kpiLines: 18, resultsEntered: 18, missing: 0, status: "SUBMITTED" },
];

export const inputPeriods: InputPeriod[] = [
  { id: 1, shortLabel: "Jan 2026", period: "January 2026", kpiLines: 50, entered: 50, missing: 0, validation: "No Errors", status: "Closed", closedAt: "31/01/2026" },
  { id: 2, shortLabel: "Feb 2026", period: "February 2026", kpiLines: 50, entered: 50, missing: 0, validation: "No Errors", status: "Closed", closedAt: "28/02/2026" },
  { id: 3, shortLabel: "Mar 2026", period: "March 2026", kpiLines: 50, entered: 49, missing: 1, validation: "With Warnings", status: "Closed with Exceptions", closedAt: "31/03/2026" },
  { id: 4, shortLabel: "Apr 2026", period: "April 2026", kpiLines: 50, entered: 48, missing: 2, validation: "With Warnings", status: "Validated", closedAt: "" },
  { id: 5, shortLabel: "May 2026", period: "May 2026", kpiLines: 50, entered: 42, missing: 8, validation: "Pending Validation", status: "Continue Entry", closedAt: "" },
  { id: 6, shortLabel: "Jun 2026", period: "June 2026", kpiLines: 50, entered: null, missing: null, validation: "Locked", status: "Locked", closedAt: "" },
];

export type KpiResult = {
  code: string;
  name: string;
  unit: string;
  dataSource: string;
  goal: string;
  result: string;
  compliance: number | null;
  score: number | null;
  method: "Template" | "Manual";
  entryStatus: "Entered" | "Pending";
  validation: "Valid" | "Warning" | "Missing";
  trafficLight: "Excellent" | "Warning" | "Caution";
};

const baseKpiResults: KpiResult[] = [
  { code: "KPI-049", name: "Reduce operating costs", unit: "%", dataSource: "Integrator - EMS", goal: "Reduce 20%", result: "18%", compliance: 98, score: 98, method: "Template", entryStatus: "Entered", validation: "Valid", trafficLight: "Excellent" },
  { code: "KPI-050", name: "Productivity kms/head", unit: "kms", dataSource: "Integrator - EMS", goal: "3,700 kms", result: "3,932", compliance: 115, score: 100, method: "Template", entryStatus: "Entered", validation: "Valid", trafficLight: "Excellent" },
  { code: "KPI-052", name: "Transportation damages", unit: "count", dataSource: "EMS-Depot", goal: "0 damages", result: "0", compliance: 100, score: 100, method: "Template", entryStatus: "Entered", validation: "Valid", trafficLight: "Excellent" },
  { code: "KPI-053", name: "Gensets sales", unit: "%", dataSource: "Integrator - EMS", goal: "+5%", result: "+3.2%", compliance: 68.2, score: 68.2, method: "Template", entryStatus: "Entered", validation: "Warning", trafficLight: "Warning" },
  { code: "KPI-054", name: "Increase EXA trips", unit: "count", dataSource: "EMS", goal: "+100", result: "—", compliance: null, score: null, method: "Template", entryStatus: "Pending", validation: "Missing", trafficLight: "Caution" },
  { code: "KPI-061", name: "On-time dispatch rate", unit: "%", dataSource: "TMS", goal: "≥ 95%", result: "96.4%", compliance: 101.5, score: 100, method: "Manual", entryStatus: "Entered", validation: "Valid", trafficLight: "Excellent" },
];

const generatedKpiNames = [
  "Fleet availability", "Preventive maintenance compliance", "Fuel efficiency", "Empty mileage reduction",
  "Container turnaround time", "Customer claim resolution", "Invoice accuracy", "Collection effectiveness",
  "Driver safety compliance", "Warehouse occupancy", "Order fulfillment rate", "Delivery lead time",
  "Route plan adherence", "Vehicle utilization", "Cost per kilometer", "Supplier service level",
  "Inventory record accuracy", "Training plan completion", "Employee retention", "System uptime",
  "Data quality compliance", "Carbon emissions intensity",
] as const;

const generatedKpiResults: KpiResult[] = Array.from({ length: 44 }, (_, index) => {
  const pending = index === 43;
  const score = 82 + (index * 7) % 19;
  const percentageUnit = index % 4 !== 2;
  const name = generatedKpiNames[index % generatedKpiNames.length];
  return {
    code: `KPI-${String(index + 62).padStart(3, "0")}`,
    name: index >= generatedKpiNames.length ? `${name} - Regional` : name,
    unit: percentageUnit ? "%" : index % 2 ? "hours" : "count",
    dataSource: index % 3 === 0 ? "Integrator - EMS" : index % 3 === 1 ? "TMS" : "Operational Template",
    goal: percentageUnit ? `≥ ${88 + index % 10}%` : `≤ ${4 + index % 8}`,
    result: pending ? "—" : percentageUnit ? `${score}%` : String(2 + index % 9),
    compliance: pending ? null : score,
    score: pending ? null : score,
    method: index % 3 === 0 ? "Manual" : "Template",
    entryStatus: pending ? "Pending" : "Entered",
    validation: pending ? "Missing" : "Valid",
    trafficLight: pending ? "Caution" : score >= 90 ? "Excellent" : "Warning",
  };
});

export const kpiResults: KpiResult[] = [...baseKpiResults, ...generatedKpiResults];

export type AttachedKpi = KpiResult & { weight: number | null };
export type AttachedScorecard = {
  code: string;
  name: string;
  period: string;
  departments: string[];
  entryStatus: string;
  previewScore: number;
  kpis: AttachedKpi[];
};

const byCode = (code: string, weight: number | null): AttachedKpi => ({ ...kpiResults.find((kpi) => kpi.code === code)!, weight });

export const attachedScorecards: AttachedScorecard[] = [
  { code: "SCD-100", name: "EXA Operations", period: "Jun 2026", departments: ["Systems & Processes"], entryStatus: "Approved", previewScore: 92, kpis: [byCode("KPI-049", 30), byCode("KPI-050", 25), byCode("KPI-052", 20), byCode("KPI-053", 25)] },
  { code: "SCD-101", name: "GPS & Systems", period: "Jun 2026", departments: ["Customer Service", "Support"], entryStatus: "Submitted", previewScore: 69.81, kpis: [byCode("KPI-050", 20), byCode("KPI-053", 15), byCode("KPI-054", 15), byCode("KPI-061", 25)] },
  { code: "SCD-102", name: "Finance EXA", period: "Jun 2026", departments: ["Containers"], entryStatus: "Closed", previewScore: 73.5, kpis: [byCode("KPI-049", 35), byCode("KPI-052", 25), byCode("KPI-053", null)] },
  { code: "SCD-103", name: "EXA Group - Q2 2026", period: "Jun 2026", departments: ["Administration", "Billing"], entryStatus: "Pending Input", previewScore: 79, kpis: [byCode("KPI-049", 20), byCode("KPI-050", 20), byCode("KPI-053", 20), byCode("KPI-054", 20), byCode("KPI-061", 20)] },
  { code: "SCD-104", name: "Fleet Performance", period: "Jun 2026", departments: ["Operations", "Fleet Management"], entryStatus: "Approved", previewScore: 91.4, kpis: [byCode("KPI-062", 20), byCode("KPI-063", 20), byCode("KPI-064", 15), byCode("KPI-065", 15), byCode("KPI-075", 15), byCode("KPI-076", 15)] },
  { code: "SCD-105", name: "Customer Experience", period: "Jun 2026", departments: ["Customer Service", "Commercial"], entryStatus: "Submitted", previewScore: 87.25, kpis: [byCode("KPI-067", 20), byCode("KPI-072", 20), byCode("KPI-073", 20), byCode("KPI-074", 20), byCode("KPI-078", 20)] },
  { code: "SCD-106", name: "Safety & Compliance", period: "Jun 2026", departments: ["Safety", "Human Resources"], entryStatus: "Approved", previewScore: 94.6, kpis: [byCode("KPI-070", 25), byCode("KPI-071", 20), byCode("KPI-079", 20), byCode("KPI-080", 20), byCode("KPI-083", 15)] },
  { code: "SCD-107", name: "Warehouse & Inventory", period: "Jun 2026", departments: ["Warehousing", "Containers"], entryStatus: "Pending Input", previewScore: 84.75, kpis: [byCode("KPI-066", 20), byCode("KPI-069", 20), byCode("KPI-071", 20), byCode("KPI-077", 20), byCode("KPI-078", 20)] },
  { code: "SCD-108", name: "Digital Operations", period: "Jun 2026", departments: ["Systems & Processes", "Innovation"], entryStatus: "Closed", previewScore: 96.1, kpis: [byCode("KPI-080", 25), byCode("KPI-081", 25), byCode("KPI-082", 20), byCode("KPI-083", 15), byCode("KPI-084", 15)] },
];

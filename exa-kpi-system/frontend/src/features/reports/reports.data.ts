export type ReportScorecard = {
  code: string;
  name: string;
  departments: string[];
  period: string;
  frequency: string;
  kpis: number;
  score: number;
  status: "Closed" | "Closed with Exceptions" | "Validated" | "Submitted";
  ownKpiWeight: number;
  linkedWeight: number;
  green: number;
  yellow: number;
  red: number;
};

export const reportScorecards: ReportScorecard[] = [
  { code: "SC-001", name: "EXA Operations", departments: ["Operations", "GPS"], period: "Jun 2026", frequency: "Monthly", kpis: 8, score: 93.79, status: "Closed", ownKpiWeight: 69, linkedWeight: 25, green: 5, yellow: 3, red: 0 },
  { code: "SC-011", name: "Pricing EXA", departments: ["Pricing", "Sales"], period: "Jun 2026", frequency: "Monthly", kpis: 6, score: 73.87, status: "Closed", ownKpiWeight: 60, linkedWeight: 14, green: 2, yellow: 3, red: 1 },
  { code: "SC-012", name: "La Mega EXA.SA", departments: ["Operations", "GPS"], period: "Jun 2026", frequency: "Monthly", kpis: 7, score: 83.79, status: "Closed", ownKpiWeight: 62, linkedWeight: 22, green: 3, yellow: 4, red: 0 },
  { code: "SC-002", name: "EXA Customer Service", departments: ["Customer Service"], period: "Jun 2026", frequency: "Monthly", kpis: 10, score: 91.27, status: "Closed", ownKpiWeight: 81, linkedWeight: 10, green: 9, yellow: 1, red: 0 },
  { code: "SC-003", name: "EXA Systems · H1 2026", departments: ["Systems", "Processes"], period: "Jun 2026", frequency: "Semiannual", kpis: 10, score: 92.27, status: "Closed", ownKpiWeight: 82, linkedWeight: 10, green: 9, yellow: 1, red: 0 },
  { code: "SC-004", name: "EXA Administration", departments: ["Administration", "Invoicing"], period: "Jun 2026", frequency: "Monthly", kpis: 8, score: 88.27, status: "Closed with Exceptions", ownKpiWeight: 80, linkedWeight: 8, green: 6, yellow: 2, red: 0 },
  { code: "SC-018", name: "Container Operations", departments: ["Containers"], period: "May 2026", frequency: "Monthly", kpis: 9, score: 78.43, status: "Validated", ownKpiWeight: 70, linkedWeight: 8, green: 4, yellow: 4, red: 1 },
  { code: "SC-020", name: "Commercial Growth", departments: ["Sales"], period: "Jun 2026", frequency: "Monthly", kpis: 7, score: 86.15, status: "Submitted", ownKpiWeight: 76, linkedWeight: 10, green: 5, yellow: 2, red: 0 },
];

export const reportKpis = [
  { code: "KPI-049", name: "Reduce operating costs", weight: 10, unit: "%", source: "Integrator EMS - SAP", goal: "Reduce 20%", result: "18%", compliance: 98, score: 87, traffic: "Excellent" },
  { code: "KPI-050", name: "Productivity kms/head", weight: 20, unit: "$/km", source: "Integrator EMS - SAP", goal: "3,700 kms", result: "3,945 kms", compliance: 115, score: 100, traffic: "Excellent" },
  { code: "KPI-051", name: "Increase container sales", weight: 10, unit: "$", source: "Integrator EMS - SAP", goal: "+100", result: "57", compliance: 57, score: 57, traffic: "Danger" },
  { code: "KPI-052", name: "Transportation damages", weight: 5, unit: "count", source: "EMS", goal: "0 damages", result: "1 damage", compliance: 65, score: 65, traffic: "Warning" },
  { code: "KPI-053", name: "Increase Gensets sales", weight: 15, unit: "$", source: "Depot - EMS", goal: "+5%", result: "+4.85%", compliance: 97.2, score: 97.2, traffic: "Excellent" },
];

export const linkedReportScorecards = [
  { code: "SC-021", name: "EXA Safety", weight: 15, score: 96.4, weightedValue: 14.46, status: "Closed" },
  { code: "SC-032", name: "Customer Experience", weight: 10, score: 88.2, weightedValue: 8.82, status: "Closed" },
  { code: "SC-041", name: "Financial Control", weight: 10, score: 79.5, weightedValue: 7.95, status: "Closed with Exceptions" },
];

export const scorecardHistory = [
  { code: "SC-24-001", name: "EXA Operations", departments: "Operations, GPS", frequency: "Monthly", duration: "Jan-Jun 2024", generated: 6, scores: [84, 86, 84, 86, 86], average: 85.2, trend: "Improved", status: "Closed", year: "2024" },
  { code: "SC-24-002", name: "Customer Service", departments: "Customer Service", frequency: "Monthly", duration: "Jan-Jun 2024", generated: 6, scores: [92, 91, 92, 91, 91], average: 91.4, trend: "Stable", status: "Closed", year: "2024" },
  { code: "SC-25-001", name: "EXA Operations", departments: "Operations, GPS", frequency: "Monthly", duration: "Jan-Jun 2025", generated: 6, scores: [83, 85, 86, 84, 87], average: 85.0, trend: "Improved", status: "Closed", year: "2025" },
  { code: "SC-25-002", name: "Customer Service", departments: "Customer Service", frequency: "Monthly", duration: "Jan-Jun 2025", generated: 6, scores: [90, 91, 89, 92, 93], average: 91.0, trend: "Improved", status: "Closed", year: "2025" },
  { code: "SC-25-003", name: "EXA Safety", departments: "Safety, Operations", frequency: "Monthly", duration: "Jan-Jun 2025", generated: 12, scores: [87, 88, 90, 89, 91], average: 89.0, trend: "Improved", status: "Closed", year: "2025" },
  { code: "SC-25-004", name: "Pricing EXA", departments: "Pricing, Sales", frequency: "Monthly", duration: "Jan-Jun 2025", generated: 6, scores: [76, 75, 74, 76, 77], average: 75.6, trend: "Stable", status: "Closed with Exceptions", year: "2025" },
  { code: "SC-25-005", name: "EXA Systems", departments: "Operations, Processes", frequency: "Semiannual", duration: "Apr-Sep 2025", generated: 2, scores: [null, null, null, null, null], average: 80.4, trend: "Improved", status: "Validated", year: "2025" },
  { code: "SC-26-001", name: "EXA Operations", departments: "Operations, GPS", frequency: "Monthly", duration: "Jan-Jun 2026", generated: 6, scores: [84, 86, 84, 86, 86], average: 85.2, trend: "Improved", status: "Closed", year: "2026" },
  { code: "SC-26-002", name: "Customer Service", departments: "Customer Service", frequency: "Monthly", duration: "Jan-Jun 2026", generated: 6, scores: [92, 91, 92, 91, 91], average: 91.4, trend: "Stable", status: "Closed", year: "2026" },
  { code: "SC-24-003", name: "EXA Safety", departments: "Safety, Operations", frequency: "Monthly", duration: "Jan-Jun 2024", generated: 12, scores: [89, 90, 89, 90, 90], average: 89.6, trend: "Improved", status: "Closed", year: "2024" },
  { code: "SC-26-003", name: "EXA Safety", departments: "Safety, Operations", frequency: "Monthly", duration: "Jan-Jun 2026", generated: 12, scores: [89, 90, 89, 90, 90], average: 89.6, trend: "Improved", status: "Closed", year: "2026" },
  { code: "SC-26-004", name: "Pricing EXA", departments: "Pricing, Sales", frequency: "Monthly", duration: "Jan-Jun 2026", generated: 6, scores: [74, 72, 74, 72, 72], average: 72.8, trend: "Declined", status: "Closed with Exceptions", year: "2026" },
  { code: "SC-26-005", name: "EXA Systems", departments: "Operations, Processes", frequency: "Semiannual", duration: "Apr-Sep 2026", generated: 2, scores: [null, null, null, null, null], average: 81.6, trend: "Improved", status: "Validated", year: "2026" },
];

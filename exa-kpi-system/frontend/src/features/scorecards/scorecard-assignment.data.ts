export type AssignmentKpi = {
  id: string;
  configCode: string;
  code: string;
  name: string;
  category: string;
  goal: string;
  source: string;
  weight: number;
};

export type AssignmentLinkedScorecard = {
  id: string;
  code: string;
  name: string;
  company: string;
  department: string;
  frequency: string;
  weight: number;
};

export const assignmentKpiCatalog: AssignmentKpi[] = [
  { id: "kpc-049", configCode: "KPC-049-01", code: "KPI-049", name: "Reduce operating costs", category: "Financial", goal: "Reduce 20%", source: "Integration EMS - SAP", weight: 10 },
  { id: "kpc-050", configCode: "KPC-050-01", code: "KPI-050", name: "Productivity km per truck", category: "Operations", goal: "3,700 km", source: "Integration EMS - SAP", weight: 10 },
  { id: "kpc-051", configCode: "KPC-051-01", code: "KPI-051", name: "Increase container sales", category: "Commercial", goal: "+100", source: "Integration EMS - SAP", weight: 10 },
  { id: "kpc-052", configCode: "KPC-052-01", code: "KPI-052", name: "Transportation damages", category: "Operations", goal: "0 damages", source: "EMS", weight: 10 },
  { id: "kpc-053", configCode: "KPC-053-01", code: "KPI-053", name: "Increase Genset sales", category: "Commercial", goal: "+5%", source: "Depot - EMS", weight: 10 },
  { id: "kpc-054", configCode: "KPC-054-01", code: "KPI-054", name: "Fleet availability", category: "Operations", goal: "95%", source: "TMS", weight: 8 },
  { id: "kpc-055", configCode: "KPC-055-01", code: "KPI-055", name: "Average response time", category: "Service", goal: "≤ 24 h", source: "CRM", weight: 7 },
  { id: "kpc-056", configCode: "KPC-056-01", code: "KPI-056", name: "Maintenance compliance", category: "Safety", goal: "98%", source: "Maintenance Hub", weight: 5 },
  { id: "kpc-057", configCode: "KPC-057-01", code: "KPI-057", name: "Invoice accuracy", category: "Financial", goal: "99%", source: "ERP", weight: 0 },
  { id: "kpc-058", configCode: "KPC-058-01", code: "KPI-058", name: "Customer retention", category: "Commercial", goal: "96%", source: "CRM", weight: 0 },
];

export const assignmentLinkedCatalog: AssignmentLinkedScorecard[] = [
  { id: "scd-0104", code: "SCD-0104", name: "Monthly Billing", company: "EXA", department: "Finance", frequency: "Monthly", weight: 12 },
  { id: "scd-0107", code: "SCD-0107", name: "Monthly MRM", company: "CONMOXA", department: "Operations", frequency: "Monthly", weight: 10 },
  { id: "scd-0109", code: "SCD-0109", name: "Monthly Customer Service", company: "Grupo EXA", department: "Service", frequency: "Monthly", weight: 8 },
  { id: "scd-0114", code: "SCD-0114", name: "EXA/TREXA Operations", company: "EXA", department: "Process", frequency: "Monthly", weight: 0 },
  { id: "scd-0116", code: "SCD-0116", name: "Quarterly Safety", company: "TREXA", department: "Safety", frequency: "Quarterly", weight: 0 },
];

type AssignmentState = {
  kpis: AssignmentKpi[];
  linked: AssignmentLinkedScorecard[];
};

const assignments = new Map<number, AssignmentState>();

export function getAssignment(scorecardId: number): AssignmentState {
  if (!assignments.has(scorecardId)) {
    assignments.set(scorecardId, {
      kpis: assignmentKpiCatalog.slice(0, 8).map((item) => ({ ...item })),
      linked: assignmentLinkedCatalog.slice(0, 3).map((item) => ({ ...item })),
    });
  }
  const assignment = assignments.get(scorecardId)!;
  return {
    kpis: assignment.kpis.map((item) => ({ ...item })),
    linked: assignment.linked.map((item) => ({ ...item })),
  };
}

export function saveAssignment(scorecardId: number, state: AssignmentState) {
  assignments.set(scorecardId, {
    kpis: state.kpis.map((item) => ({ ...item })),
    linked: state.linked.map((item) => ({ ...item })),
  });
}

export function saveAssignmentSelection(scorecardId: number, type: "kpis" | "linked", selectedIds: string[]) {
  const current = getAssignment(scorecardId);
  if (type === "kpis") {
    const previousWeights = new Map(current.kpis.map((item) => [item.id, item.weight]));
    current.kpis = assignmentKpiCatalog.filter((item) => selectedIds.includes(item.id)).map((item) => ({ ...item, weight: previousWeights.get(item.id) ?? 0 }));
  } else {
    const previousWeights = new Map(current.linked.map((item) => [item.id, item.weight]));
    current.linked = assignmentLinkedCatalog.filter((item) => selectedIds.includes(item.id)).map((item) => ({ ...item, weight: previousWeights.get(item.id) ?? 0 }));
  }
  saveAssignment(scorecardId, current);
}

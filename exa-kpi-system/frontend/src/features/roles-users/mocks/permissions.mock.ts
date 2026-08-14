import type { Permission, PermissionModule } from "../roles/types/permission.types";

const modules: Array<{ module: PermissionModule; prefix: string }> = [
  { module: "KPI Management", prefix: "KPI_DEFINITION" },
  { module: "KPI Pool", prefix: "KPI_POOL" },
  { module: "ScoreCards", prefix: "SCORECARD" },
  { module: "Monitoring Results", prefix: "MONITORING" },
  { module: "Reports", prefix: "REPORTS" },
  { module: "Roles/Users", prefix: "ROLES_USERS" },
];

const actions = ["View", "Create", "Update", "Delete", "Export", "Manage"] as const;

export const basePermissions: Permission[] = modules.flatMap(({ module, prefix }) =>
  actions.map((action) => ({
    id: `${prefix}_${action.toUpperCase()}`,
    code: `${prefix}_${action.toUpperCase()}`,
    label: action === "Delete" ? "Delete / Soft Delete" : action,
    module,
    action,
  })),
);

export const specialPermissions: Permission[] = [
  ["VIEW_RAW_RESULTS", "View raw results", "Monitoring Results"],
  ["VIEW_DATA_SOURCE", "View data source", "Monitoring Results"],
  ["MONITORING_VALIDATE_RESULTS", "Validate results", "Monitoring Results"],
  ["MONITORING_CLOSE_PERIOD", "Close period", "Monitoring Results"],
  ["MONITORING_CLOSE_WITH_EXCEPTIONS", "Close with exceptions", "Monitoring Results"],
  ["MANAGE_SCORECARD_ASSIGNMENT", "Manage assignment", "ScoreCards"],
  ["MANAGE_ROLE_PERMISSIONS", "Manage role permissions", "Roles/Users"],
  ["MANAGE_USER_SCOPE", "Manage user scope", "Roles/Users"],
  ["REPORTS_EXPORT", "Export reports", "Reports"],
  ["MONITORING_ENTER_RESULTS", "Enter results", "Monitoring Results"],
].map(([code, label, module]) => ({ id: code, code, label, module: module as PermissionModule, action: "Special" }));

export const mockPermissions = [...basePermissions, ...specialPermissions];

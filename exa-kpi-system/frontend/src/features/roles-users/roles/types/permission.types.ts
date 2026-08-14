export type PermissionAction = "View" | "Create" | "Update" | "Delete" | "Export" | "Manage";

export type PermissionModule =
  | "KPI Management"
  | "KPI Pool"
  | "ScoreCards"
  | "Monitoring Results"
  | "Reports"
  | "Roles/Users";

export type Permission = {
  id: string;
  code: string;
  label: string;
  module: PermissionModule;
  action: PermissionAction | "Special";
};

export type RolePermissionUpdate = {
  roleId: string;
  permissionCodes: string[];
};

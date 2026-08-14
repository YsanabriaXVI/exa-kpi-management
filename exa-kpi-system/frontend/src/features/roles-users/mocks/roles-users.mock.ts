import type { User } from "../users/types/user.types";
import type { Role } from "../roles/types/role.types";
import type { UserActionLog } from "../audit/types/user-action-log.types";
import { mockPermissions } from "./permissions.mock";

export const mockDepartments = ["Operations", "Finance", "Transport", "SAC", "Human Resources", "Systems"].map((name) => ({ id: name.toLowerCase().replace(/ /g, "-"), name }));

const all = mockPermissions.map((permission) => permission.code);
export const mockRoles: Role[] = [
  { id: "role-admin", name: "Admin", description: "Full system administration and global data access.", status: "Active", isProtected: true, permissionCodes: all, createdAt: "2026-01-10T14:00:00Z", updatedAt: "2026-07-15T18:00:00Z", deletedAt: null },
  { id: "role-manager", name: "Manager", description: "Department leadership, validation, closing, and reporting.", status: "Active", isProtected: false, permissionCodes: ["KPI_DEFINITION_VIEW", "KPI_POOL_VIEW", "SCORECARD_VIEW", "MONITORING_VIEW", "MONITORING_VALIDATE_RESULTS", "MONITORING_CLOSE_PERIOD", "REPORTS_VIEW", "REPORTS_EXPORT"], createdAt: "2026-01-10T14:00:00Z", updatedAt: "2026-07-29T17:00:00Z", deletedAt: null },
  { id: "role-analyst", name: "Analyst", description: "Department result capture and submission.", status: "Active", isProtected: false, permissionCodes: ["KPI_POOL_VIEW", "SCORECARD_VIEW", "MONITORING_VIEW", "MONITORING_ENTER_RESULTS", "REPORTS_VIEW"], createdAt: "2026-01-10T14:00:00Z", updatedAt: "2026-06-20T15:00:00Z", deletedAt: null },
  { id: "role-viewer", name: "Viewer", description: "Read-only ScoreCards and Reports access.", status: "Active", isProtected: false, permissionCodes: ["SCORECARD_VIEW", "REPORTS_VIEW"], createdAt: "2026-01-10T14:00:00Z", updatedAt: "2026-06-20T15:00:00Z", deletedAt: null },
];

const dept = (...ids: string[]) => mockDepartments.filter((item) => ids.includes(item.id));
export const mockUsers: User[] = [
  { id: "user-carlos", username: "carlos.gomez", email: "carlos.gomez@exa.mx", firstName: "Carlos", lastName: "Gomez", fullName: "Carlos Gomez", roleId: "role-admin", roleName: "Admin", status: "Active", departments: [], accessScopes: [], isGlobalScope: true, lastLoginAt: "2026-08-05T13:32:00Z", createdAt: "2026-01-10T14:00:00Z", updatedAt: "2026-08-05T13:32:00Z", deletedAt: null },
  { id: "user-ana", username: "ana_finance", email: "ana@exa.mx", firstName: "Ana", lastName: "Torres", fullName: "Ana Torres", roleId: "role-analyst", roleName: "Analyst", status: "Inactive", departments: dept("finance"), accessScopes: ["finance"], isGlobalScope: false, lastLoginAt: "2026-07-31T16:20:00Z", createdAt: "2026-02-12T15:00:00Z", updatedAt: "2026-08-01T12:00:00Z", deletedAt: null },
  { id: "user-luis", username: "luis.transport", email: "luis@exa.mx", firstName: "Luis", lastName: "Mendoza", fullName: "Luis Mendoza", roleId: "role-manager", roleName: "Manager", status: "Active", departments: dept("transport"), accessScopes: ["transport"], isGlobalScope: false, lastLoginAt: "2026-08-04T19:10:00Z", createdAt: "2026-03-03T15:00:00Z", updatedAt: "2026-07-28T12:00:00Z", deletedAt: null },
  { id: "user-sofia", username: "sofia.ops", email: "sofia@exa.mx", firstName: "Sofia", lastName: "Ruiz", fullName: "Sofia Ruiz", roleId: "role-viewer", roleName: "Viewer", status: "Active", departments: dept("operations", "sac"), accessScopes: ["operations", "sac"], isGlobalScope: false, lastLoginAt: null, createdAt: "2026-06-18T15:00:00Z", updatedAt: "2026-06-18T15:00:00Z", deletedAt: null },
  { id: "user-deleted", username: "old.user", email: "old@exa.mx", firstName: "Old", lastName: "User", fullName: "Old User", roleId: "role-viewer", roleName: "Viewer", status: "Inactive", departments: dept("systems"), accessScopes: ["systems"], isGlobalScope: false, lastLoginAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2026-05-01T00:00:00Z", deletedAt: "2026-05-01T00:00:00Z" },
];

export const mockUserActionLogs: UserActionLog[] = [
  { id: "log-1", occurredAt: "2026-08-01T12:00:00Z", action: "USER_DISABLED", target: "ana_finance", oldValue: "Active", newValue: "Inactive", performedBy: "Carlos Gomez", performedByRole: "Admin", notes: "Admin disabled user ana_finance." },
  { id: "log-2", occurredAt: "2026-07-29T17:00:00Z", action: "ROLE_PERMISSIONS_UPDATED", target: "Manager", oldValue: "CLOSE_PERIOD disabled", newValue: "CLOSE_PERIOD enabled", performedBy: "Carlos Gomez", performedByRole: "Admin", notes: "Updated Manager role permissions." },
  { id: "log-3", occurredAt: "2026-07-28T12:00:00Z", action: "DEPARTMENT_SCOPE_CHANGED", target: "Luis Mendoza", oldValue: "Operations", newValue: "Transport", performedBy: "Carlos Gomez", performedByRole: "Admin", notes: "Changed department scope for Luis to Transport." },
  { id: "log-4", occurredAt: "2026-07-20T10:30:00Z", action: "ROLE_CHANGED", target: "Sofia Ruiz", oldValue: "Analyst", newValue: "Viewer", performedBy: "Carlos Gomez", performedByRole: "Admin", notes: "Changed Sofia from Analyst to Viewer." },
];

export const CURRENT_USER_ID = "user-carlos";

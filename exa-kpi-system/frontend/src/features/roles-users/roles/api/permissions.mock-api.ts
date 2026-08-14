import { mockPermissions } from "../../mocks/permissions.mock";
import { mockRoles, mockUserActionLogs } from "../../mocks/roles-users.mock";
import { rolePermissionsUpdateSchema } from "../schemas/permission.schemas";
import type { RolePermissionUpdate } from "../types/permission.types";

export async function listPermissions() { return Promise.resolve(mockPermissions); }
export async function getRolePermissions(roleId: string) { return Promise.resolve(mockRoles.find((role) => role.id === roleId)?.permissionCodes ?? []); }
export async function updateRolePermissions(input: RolePermissionUpdate) {
  rolePermissionsUpdateSchema.parse(input);
  const role = mockRoles.find((item) => item.id === input.roleId && !item.deletedAt);
  if (!role) throw new Error("Role not found.");
  const old = role.permissionCodes; role.permissionCodes = [...input.permissionCodes]; role.updatedAt = new Date().toISOString();
  mockUserActionLogs.unshift({ id: crypto.randomUUID(), occurredAt: role.updatedAt, action: "ROLE_PERMISSIONS_UPDATED", target: role.name, oldValue: `${old.length} permissions`, newValue: `${input.permissionCodes.length} permissions`, performedBy: "Carlos Gomez", performedByRole: "Admin", notes: "Role permissions updated in mock state." });
  return Promise.resolve(role.permissionCodes);
}

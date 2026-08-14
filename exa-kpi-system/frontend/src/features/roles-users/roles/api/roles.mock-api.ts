import { mockRoles, mockUsers } from "../../mocks/roles-users.mock";

export async function listRoles(includeInactive = true) {
  const roles = mockRoles.filter((role) => !role.deletedAt && (includeInactive || role.status === "Active")).map((role) => ({ ...role, usersCount: mockUsers.filter((user) => !user.deletedAt && user.roleId === role.id).length }));
  return Promise.resolve(roles);
}
export async function getRole(roleId: string) { return Promise.resolve(mockRoles.find((role) => role.id === roleId && !role.deletedAt) ?? null); }

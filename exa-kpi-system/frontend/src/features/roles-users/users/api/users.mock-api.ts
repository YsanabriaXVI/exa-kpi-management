import { CURRENT_USER_ID, mockDepartments, mockRoles, mockUserActionLogs, mockUsers } from "../../mocks/roles-users.mock";
import { addNewUserSchema, departmentScopeSchema, userStatusUpdateSchema } from "../schemas/user.schemas";
import type { CreateUserInput, UpdateUserInput, User, UserFilters, UserStatus } from "../types/user.types";

const delay = <T,>(value: T) => new Promise<T>((resolve) => window.setTimeout(() => resolve(value), 120));
const activeUsers = () => mockUsers.filter((user) => !user.deletedAt);
const log = (action: Parameters<typeof mockUserActionLogs.unshift>[0]["action"], target: string, oldValue: string, newValue: string, notes: string) => {
  mockUserActionLogs.unshift({ id: crypto.randomUUID(), occurredAt: new Date().toISOString(), action, target, oldValue, newValue, performedBy: "Carlos Gomez", performedByRole: "Admin", notes });
};

export async function listUsers(filters: UserFilters = {}) {
  const term = filters.search?.trim().toLowerCase();
  const visibleUsers = filters.includeDeleted ? mockUsers : activeUsers();
  return delay(visibleUsers.filter((user) =>
    (!term || [user.username, user.fullName, user.email].some((value) => value.toLowerCase().includes(term))) &&
    (!filters.roleIds?.length || filters.roleIds.includes(user.roleId)) &&
    (Boolean(user.deletedAt) || !filters.statuses?.length || filters.statuses.includes(user.status)) &&
    (!filters.departmentIds?.length || user.isGlobalScope || filters.departmentIds.some((departmentId) => user.accessScopes.includes(departmentId)))
  ));
}

export async function getUser(userId: string) { return delay(activeUsers().find((user) => user.id === userId) ?? null); }

export async function createUser(input: CreateUserInput) {
  const parsed = addNewUserSchema.parse(input);
  if (mockUsers.some((user) => user.username.toLowerCase() === parsed.username.toLowerCase())) throw new Error("Username is already in use.");
  if (mockUsers.some((user) => user.email.toLowerCase() === parsed.email.toLowerCase())) throw new Error("Email is already in use.");
  const role = mockRoles.find((item) => item.id === parsed.roleId && item.status === "Active" && !item.deletedAt);
  if (!role) throw new Error("Select an active role.");
  // Backend requirement: hash passwords with bcrypt; never persist or log plain text.
  const now = new Date().toISOString();
  const departments = mockDepartments.filter((item) => parsed.departmentIds.includes(item.id));
  const user: User = { id: crypto.randomUUID(), username: parsed.username, email: parsed.email, firstName: parsed.firstName ?? "", lastName: parsed.lastName ?? "", fullName: [parsed.firstName, parsed.lastName].filter(Boolean).join(" ") || parsed.username, roleId: role.id, roleName: role.name, status: "Active", departments, accessScopes: departments.map((item) => item.id), isGlobalScope: parsed.isGlobalScope, lastLoginAt: null, createdAt: now, updatedAt: now, deletedAt: null, sendAccountEmail: parsed.sendAccountEmail };
  mockUsers.push(user);
  log("USER_CREATED", user.fullName, "—", `${role.name}; ${parsed.isGlobalScope ? "Global" : departments.map((item) => item.name).join(", ")}`, "Created mocked user account. No email was sent.");
  return delay(user);
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  departmentScopeSchema.parse(input);
  const user = mockUsers.find((item) => item.id === userId && !item.deletedAt);
  if (!user) throw new Error("User not found.");
  const role = mockRoles.find((item) => item.id === input.roleId && item.status === "Active" && !item.deletedAt);
  if (!role) throw new Error("Role does not exist or is inactive.");
  if (mockUsers.some((item) => item.id !== userId && item.username.toLowerCase() === input.username.toLowerCase())) throw new Error("Username is already in use.");
  if (mockUsers.some((item) => item.id !== userId && item.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email is already in use.");
  const oldRole = user.roleName;
  const oldScope = user.isGlobalScope ? "Global" : user.departments.map((item) => item.name).join(", ");
  const departments = mockDepartments.filter((item) => input.departmentIds.includes(item.id));
  Object.assign(user, input, { fullName: [input.firstName, input.lastName].filter(Boolean).join(" ") || input.username, roleName: role.name, departments, accessScopes: departments.map((item) => item.id), updatedAt: new Date().toISOString() });
  if (oldRole !== role.name) log("ROLE_CHANGED", user.fullName, oldRole, role.name, `Changed primary role from ${oldRole} to ${role.name}.`);
  const newScope = user.isGlobalScope ? "Global" : departments.map((item) => item.name).join(", ");
  if (oldScope !== newScope) log("DEPARTMENT_SCOPE_CHANGED", user.fullName, oldScope, newScope, "Changed department access scope.");
  return delay(user);
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  userStatusUpdateSchema.parse({ userId, status });
  if (userId === CURRENT_USER_ID && status === "Inactive") throw new Error("You cannot disable your own account.");
  const user = mockUsers.find((item) => item.id === userId && !item.deletedAt);
  if (!user) throw new Error("User not found.");
  const old = user.status; user.status = status; user.updatedAt = new Date().toISOString();
  log(status === "Active" ? "USER_ENABLED" : "USER_DISABLED", user.username, old, status, `${status === "Active" ? "Enabled" : "Disabled"} user ${user.username}.`);
  return delay(user);
}

export async function softDeleteUser(userId: string) {
  if (userId === CURRENT_USER_ID) throw new Error("You cannot delete your own account.");
  const user = mockUsers.find((item) => item.id === userId && !item.deletedAt);
  if (!user) throw new Error("User not found.");
  user.deletedAt = new Date().toISOString();
  log("USER_SOFT_DELETED", user.username, "Visible", "Deleted", "User was removed from the normal list; historical records remain available.");
  return delay(undefined);
}

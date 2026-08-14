import { useQuery } from "@tanstack/react-query";
import { getRolePermissions, listPermissions } from "../api/permissions.mock-api";
export const useRolePermissions = (roleId?: string) => useQuery({ queryKey: ["roles-users", "permissions", roleId], queryFn: async () => ({ permissions: await listPermissions(), enabledCodes: await getRolePermissions(roleId!) }), enabled: Boolean(roleId) });

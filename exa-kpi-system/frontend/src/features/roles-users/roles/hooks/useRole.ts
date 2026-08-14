import { useQuery } from "@tanstack/react-query";
import { getRole } from "../api/roles.mock-api";
export const useRole = (roleId?: string) => useQuery({ queryKey: ["roles-users", "role", roleId], queryFn: () => getRole(roleId!), enabled: Boolean(roleId) });

import { useQuery } from "@tanstack/react-query";
import { listRoles } from "../api/roles.mock-api";
export const useRoles = (includeInactive = true) => useQuery({ queryKey: ["roles-users", "roles", includeInactive], queryFn: () => listRoles(includeInactive) });

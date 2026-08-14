import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../api/users.mock-api";
import type { UserFilters } from "../types/user.types";
export const useUsers = (filters: UserFilters = {}) => useQuery({ queryKey: ["roles-users", "users", filters], queryFn: () => listUsers(filters) });

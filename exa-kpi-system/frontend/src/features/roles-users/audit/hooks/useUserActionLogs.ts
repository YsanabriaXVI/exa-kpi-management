import { useQuery } from "@tanstack/react-query";
import { listUserActionLogs } from "../api/user-action-log.mock-api";
import type { UserActionLogFilters } from "../types/user-action-log.types";
export const useUserActionLogs = (filters: UserActionLogFilters = {}) => useQuery({ queryKey: ["roles-users", "audit", filters], queryFn: () => listUserActionLogs(filters) });

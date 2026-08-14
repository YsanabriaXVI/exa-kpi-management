import { useQuery } from "@tanstack/react-query";
import { getUser } from "../api/users.mock-api";
export const useUser = (userId?: string) => useQuery({ queryKey: ["roles-users", "user", userId], queryFn: () => getUser(userId!), enabled: Boolean(userId) });

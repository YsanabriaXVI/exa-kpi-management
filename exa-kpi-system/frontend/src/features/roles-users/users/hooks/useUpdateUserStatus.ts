import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserStatus } from "../api/users.mock-api";
import type { UserStatus } from "../types/user.types";
export const useUpdateUserStatus = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) => updateUserStatus(userId, status), onSuccess: () => client.invalidateQueries({ queryKey: ["roles-users"] }) }); };

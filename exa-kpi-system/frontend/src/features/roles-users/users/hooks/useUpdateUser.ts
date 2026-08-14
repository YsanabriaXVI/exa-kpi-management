import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../api/users.mock-api";
import type { UpdateUserInput } from "../types/user.types";
export const useUpdateUser = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) => updateUser(userId, input), onSuccess: () => client.invalidateQueries({ queryKey: ["roles-users"] }) }); };

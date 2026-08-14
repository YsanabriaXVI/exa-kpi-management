import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api/users.mock-api";
export const useCreateUser = () => { const client = useQueryClient(); return useMutation({ mutationFn: createUser, onSuccess: () => client.invalidateQueries({ queryKey: ["roles-users"] }) }); };

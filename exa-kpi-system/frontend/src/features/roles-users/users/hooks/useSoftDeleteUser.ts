import { useMutation, useQueryClient } from "@tanstack/react-query";
import { softDeleteUser } from "../api/users.mock-api";
export const useSoftDeleteUser = () => { const client = useQueryClient(); return useMutation({ mutationFn: softDeleteUser, onSuccess: () => client.invalidateQueries({ queryKey: ["roles-users"] }) }); };

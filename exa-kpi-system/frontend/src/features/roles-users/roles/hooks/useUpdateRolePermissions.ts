import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRolePermissions } from "../api/permissions.mock-api";
export const useUpdateRolePermissions = () => { const client = useQueryClient(); return useMutation({ mutationFn: updateRolePermissions, onSuccess: () => client.invalidateQueries({ queryKey: ["roles-users"] }) }); };

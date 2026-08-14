import { z } from "zod";

export const rolePermissionsUpdateSchema = z.object({
  roleId: z.string().min(1),
  permissionCodes: z.array(z.string()).refine((codes) => new Set(codes).size === codes.length, "Permissions must be unique."),
});

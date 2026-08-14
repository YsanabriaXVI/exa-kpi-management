import { z } from "zod";

export const roleStatusSchema = z.enum(["Active", "Inactive"]);
export const roleIdSchema = z.string().min(1, "Role is required.");

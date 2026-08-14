import { z } from "zod";

export const departmentScopeSchema = z.object({
  isGlobalScope: z.boolean(),
  departmentIds: z.array(z.string()),
}).refine((value) => value.isGlobalScope || value.departmentIds.length > 0, {
  message: "Select at least one department for a non-global user.",
  path: ["departmentIds"],
});

export const addNewUserSchema = z.object({
  username: z.string().trim().min(3, "Username is required."),
  email: z.string().trim().email("Enter a valid email address."),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  password: z.string().min(8, "Password must contain at least 8 characters."),
  confirmPassword: z.string(),
  roleId: z.string().min(1, "Select a role."),
  departmentIds: z.array(z.string()),
  isGlobalScope: z.boolean(),
  sendAccountEmail: z.boolean(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }
  const scope = departmentScopeSchema.safeParse(value);
  if (!scope.success) context.addIssue({ code: z.ZodIssueCode.custom, path: ["departmentIds"], message: "Select at least one department or enable Global Access." });
});

export const userStatusUpdateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["Active", "Inactive"]),
});

export type AddNewUserFormValues = z.infer<typeof addNewUserSchema>;

import { z } from "zod";

export const kpiDefinitionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, "Write a more descriptive KPI name.")
    .max(120, "The KPI name must be 120 characters or fewer."),
  objective: z
    .string()
    .trim()
    .min(10, "Describe the business objective in more detail.")
    .max(300, "The objective must be 300 characters or fewer."),
  category: z.string().trim().min(1, "Select a category."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type KpiDefinitionFormErrors = Partial<
  Record<keyof z.infer<typeof kpiDefinitionSchema>, string>
>;

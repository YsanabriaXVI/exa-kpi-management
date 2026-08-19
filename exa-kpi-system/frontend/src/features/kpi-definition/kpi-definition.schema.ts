import { z } from "zod";

export const kpiDefinitionSchema = z.object({
  kpiName: z.string().trim().min(5, "Write a more descriptive KPI name.").max(200),
  description: z.string().trim().min(10, "Describe the business objective in more detail."),
  kpiCategoryId: z.string().min(1, "Select a category."),
  isActive: z.boolean().optional(),
});

export type KpiDefinitionFormErrors = Partial<Record<keyof z.infer<typeof kpiDefinitionSchema>, string>>;

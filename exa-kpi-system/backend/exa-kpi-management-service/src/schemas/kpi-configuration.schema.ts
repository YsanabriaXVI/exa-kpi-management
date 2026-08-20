import { z } from "zod";
import { paginationSchema } from "./pagination.schema.js";

const id = z.string().regex(/^[1-9]\d*$/);
const score = z.number().int().min(0).max(100);
export const kpiConfigurationRangesSchema = z.object({ redFrom: score, redTo: score, yellowFrom: score, yellowTo: score, greenFrom: score, greenTo: score }).strict().superRefine((value, context) => {
  if (value.redFrom !== 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["redFrom"], message: "Red must start at 0" });
  if (value.greenTo !== 100) context.addIssue({ code: z.ZodIssueCode.custom, path: ["greenTo"], message: "Green must end at 100" });
  if (value.yellowFrom !== value.redTo + 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ["yellowFrom"], message: "Yellow must start immediately after Red" });
  if (value.greenFrom !== value.yellowTo + 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ["greenFrom"], message: "Green must start immediately after Yellow" });
  if (value.redTo >= value.yellowFrom || value.yellowTo >= value.greenFrom) context.addIssue({ code: z.ZodIssueCode.custom, message: "Traffic light ranges cannot overlap" });
});
export const kpiConfigurationIdParamsSchema = z.object({ id }).strict();
export const batchLookupKpiConfigurationsBodySchema = z.object({
  ids: z.array(id).min(1).max(100),
}).strict().transform(({ ids }) => ({ ids: [...new Set(ids)] }));
export const listKpiConfigurationsQuerySchema = paginationSchema.extend({ search: z.string().trim().max(200).optional() }).strict();
export const internalKpiConfigurationCatalogQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
}).strict();
export const kpiConfigurationBodySchema = z.object({
  definitionId: z.union([id, z.number().int().positive().transform(String)]), goal: z.number().finite(),
  measurementUnit: z.string().trim().min(1).max(50), dataSource: z.string().trim().min(1).max(120), ranges: kpiConfigurationRangesSchema,
  isActive: z.boolean().default(true),
}).strict();
export type KpiConfigurationBody = z.infer<typeof kpiConfigurationBodySchema>;
export type BatchLookupKpiConfigurationsBody = z.infer<typeof batchLookupKpiConfigurationsBodySchema>;
export type InternalKpiConfigurationCatalogQuery = z.infer<typeof internalKpiConfigurationCatalogQuerySchema>;

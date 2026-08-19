import { z } from "zod";
import { paginationSchema } from "./pagination.schema.js";

const positiveBigIntString = z.string().regex(/^[1-9]\d*$/, "Must be a positive integer ID");
const trimmedRequired = (max: number) => z.string().trim().min(1).max(max);
const repeatedQueryParam = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (value) => value === undefined ? undefined : Array.isArray(value) ? value : [value],
  z.array(schema).min(1).optional(),
);

export const kpiDefinitionIdParamsSchema = z.object({ id: positiveBigIntString }).strict();

export const listKpiDefinitionsQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  categoryId: repeatedQueryParam(positiveBigIntString),
  status: repeatedQueryParam(z.enum(["ACTIVE", "INACTIVE"])),
  sortBy: z.enum(["kpiCode", "kpiName", "description", "category", "statusCode", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const createKpiDefinitionBodySchema = z.object({
  kpiName: trimmedRequired(200),
  description: z.string().trim().min(1),
  kpiCategoryId: positiveBigIntString,
  isActive: z.boolean().default(true),
}).strict();

export const updateKpiDefinitionBodySchema = z.object({
  kpiCode: trimmedRequired(30).optional(),
  kpiName: trimmedRequired(200).optional(),
  description: z.string().trim().min(1).optional(),
  kpiCategoryId: positiveBigIntString.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one updatable field is required",
});

export type ListKpiDefinitionsQuery = z.infer<typeof listKpiDefinitionsQuerySchema>;
export type CreateKpiDefinitionBody = z.infer<typeof createKpiDefinitionBodySchema>;
export type UpdateKpiDefinitionBody = z.infer<typeof updateKpiDefinitionBodySchema>;

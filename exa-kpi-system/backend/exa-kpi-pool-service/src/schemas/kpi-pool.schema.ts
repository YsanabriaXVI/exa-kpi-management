import { z } from "zod";
import { paginationSchema } from "./pagination.schema.js";

const positiveId = z.string().regex(/^[1-9]\d*$/, "Must be a positive integer ID");
const idArray = z.array(positiveId).min(1).max(50).refine((ids) => new Set(ids).size === ids.length, "IDs must be unique");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must use YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date");
const optionalRepeated = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (value) => value === undefined ? undefined : Array.isArray(value) ? value : [value],
  z.array(schema).optional(),
);

const poolInfoFields = {
  poolName: z.string().trim().min(1).max(200),
  poolAreaIds: idArray,
  companyIds: idArray,
  inputFrequencyId: positiveId,
  validFrom: dateString,
  validTo: dateString,
  description: z.string().trim().max(10_000).nullable().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
};

export const kpiPoolIdParamsSchema = z.object({ id: positiveId }).strict();
export const kpiPoolConfigurationParamsSchema = z.object({ id: positiveId, configurationId: positiveId }).strict();
export const targetPeriodQuerySchema = z.object({ periodStart: dateString.optional() }).strict();
export const addKpiPoolConfigurationsBodySchema = z.object({ configurationIds: z.array(positiveId).min(1).max(100), effectiveFromPeriod: dateString.optional() }).strict()
  .transform(({ configurationIds, effectiveFromPeriod }) => ({ configurationIds: [...new Set(configurationIds)], effectiveFromPeriod }));
export const retireKpiPoolConfigurationBodySchema = z.object({ effectiveFromPeriod: dateString.optional() }).strict();
export const finalizePeriodCompositionBodySchema = z.object({ periodStart: dateString }).strict();
export const extendKpiPoolValidityBodySchema = z.object({ validTo: dateString }).strict();
export const replaceKpiPoolConfigurationBodySchema = z.object({ oldConfigurationId: positiveId, newConfigurationId: positiveId, effectiveFromPeriod: dateString.optional() }).strict()
  .refine((value) => value.oldConfigurationId !== value.newConfigurationId, "Replacement Configuration must be different");
export const kpiConfigurationUsageBodySchema = z.object({ configurationIds: z.array(positiveId).min(1).max(100) }).strict()
  .transform(({ configurationIds }) => ({ configurationIds: [...new Set(configurationIds)] }));
export const availableKpiConfigurationsQuerySchema = paginationSchema.extend({ search: z.string().trim().max(200).optional(), periodStart: dateString.optional() }).strict();
export const createKpiPoolBodySchema = z.object(poolInfoFields).strict().refine((value) => value.validTo >= value.validFrom, {
  message: "validTo must be on or after validFrom",
  path: ["validTo"],
});
export const updateKpiPoolBodySchema = z.object({
  poolName: poolInfoFields.poolName.optional(),
  poolAreaIds: poolInfoFields.poolAreaIds.optional(),
  companyIds: poolInfoFields.companyIds.optional(),
  inputFrequencyId: poolInfoFields.inputFrequencyId.optional(),
  validFrom: poolInfoFields.validFrom.optional(),
  validTo: poolInfoFields.validTo.optional(),
  description: poolInfoFields.description,
  notes: poolInfoFields.notes,
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const listKpiPoolsQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  status: optionalRepeated(z.enum(["DRAFT", "ACTIVE", "INACTIVE"])),
  companyId: optionalRepeated(positiveId),
  inputFrequencyId: optionalRepeated(positiveId),
  issueYear: optionalRepeated(z.coerce.number().int().min(2000).max(9999)),
  sortBy: z.enum(["poolCode", "poolName", "statusCode", "inputFrequencyCode", "issueYear", "validFrom", "validTo", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export type CreateKpiPoolBody = z.infer<typeof createKpiPoolBodySchema>;
export type UpdateKpiPoolBody = z.infer<typeof updateKpiPoolBodySchema>;
export type ListKpiPoolsQuery = z.infer<typeof listKpiPoolsQuerySchema>;
export type AddKpiPoolConfigurationsBody = { configurationIds: string[]; effectiveFromPeriod?: string };
export type AvailableKpiConfigurationsQuery = z.infer<typeof availableKpiConfigurationsQuerySchema>;
export type TargetPeriodQuery = z.infer<typeof targetPeriodQuerySchema>;
export type RetireKpiPoolConfigurationBody = z.infer<typeof retireKpiPoolConfigurationBodySchema>;
export type ReplaceKpiPoolConfigurationBody = z.infer<typeof replaceKpiPoolConfigurationBodySchema>;
export type FinalizePeriodCompositionBody = z.infer<typeof finalizePeriodCompositionBodySchema>;
export type ExtendKpiPoolValidityBody = z.infer<typeof extendKpiPoolValidityBodySchema>;

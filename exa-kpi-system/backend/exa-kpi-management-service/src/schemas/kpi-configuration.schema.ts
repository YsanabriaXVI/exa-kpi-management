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
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const effectiveKpiConfigurationSnapshotsBodySchema = z.object({
  configurationIds: z.array(id).min(1).max(100),
  periodStart: dateOnly,
  periodEnd: dateOnly,
}).strict().refine((value) => value.periodEnd >= value.periodStart, { path: ["periodEnd"], message: "periodEnd must be on or after periodStart" }).transform((value) => ({ ...value, configurationIds: [...new Set(value.configurationIds)] }));
export const listKpiConfigurationsQuerySchema = paginationSchema.extend({ search: z.string().trim().max(200).optional() }).strict();
export const internalKpiConfigurationCatalogQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
}).strict();
const resultSemantics = z.enum(["ABSOLUTE_VALUE","UNIT_COST","COUNT","CHANGE_PERCENT","COMPLIANCE_PERCENT","RATIO","DURATION","BINARY","DERIVED_PERCENTAGE"]);
const evaluationTypeCode = z.enum(["GREATER_IS_BETTER","HIGHER_IS_BETTER","LOWER_IS_BETTER","EQUAL_IS_BETTER","RANGE"]);
const scoringMethod = z.enum(["PROPORTIONAL","ZERO_TARGET_BANDS","TOLERANCE","RANGE_BASED","BINARY","MILESTONE"]);
const scoringApprovalStatus = z.enum(["PROPOSED","BLOCKED","APPROVED","NEEDS_REDEFINITION"]);
const negativeResultPolicy = z.enum(["ALLOW","DISALLOW","REVIEW"]);
const scoringRuleConfig = z.record(z.string(), z.unknown()).nullable();
export const kpiConfigurationBodySchema = z.object({
  definitionId: z.union([id, z.number().int().positive().transform(String)]), goal: z.number().finite(),
  measurementUnit: z.string().trim().min(1).max(50), dataSource: z.string().trim().min(1).max(120), ranges: kpiConfigurationRangesSchema,
  isActive: z.boolean().default(true),
  resultSemantics: resultSemantics.nullable().optional().default(null), evaluationTypeCode: evaluationTypeCode.nullable().optional().default(null),
  scoringMethod: scoringMethod.nullable().optional().default(null), scoringRuleConfig: scoringRuleConfig.optional().default(null),
  scoringRuleConfigVersion: z.number().int().positive().nullable().optional().default(null), negativeResultPolicy: negativeResultPolicy.nullable().optional().default(null),
  scoringApprovalStatus: scoringApprovalStatus.optional().default("BLOCKED"),
  effectiveFrom: dateOnly.optional(),
  changeReason: z.string().trim().max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.scoringApprovalStatus !== "APPROVED") return;
  for (const [field, configured] of [["resultSemantics", value.resultSemantics], ["evaluationTypeCode", value.evaluationTypeCode], ["scoringMethod", value.scoringMethod], ["negativeResultPolicy", value.negativeResultPolicy], ["scoringRuleConfigVersion", value.scoringRuleConfigVersion]] as const) {
    if (configured === null) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required before scoring can be APPROVED` });
  }
  const config = value.scoringRuleConfig as Record<string, unknown> | null;
  if (!config) { context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "scoringRuleConfig is required before scoring can be APPROVED" }); return; }
  if (value.scoringMethod === "PROPORTIONAL") {
    if (value.evaluationTypeCode !== "GREATER_IS_BETTER" && value.evaluationTypeCode !== "HIGHER_IS_BETTER" && value.evaluationTypeCode !== "LOWER_IS_BETTER") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "PROPORTIONAL requires Greater or Lower evaluation" });
    if (typeof config.floorPercent !== "number" || typeof config.capPercent !== "number" || config.floorPercent < 0 || config.capPercent > 100 || config.floorPercent > config.capPercent) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "PROPORTIONAL requires valid floorPercent and capPercent" });
    if (value.goal <= 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["goal"], message: "PROPORTIONAL requires Goal > 0" });
  } else if (value.scoringMethod === "ZERO_TARGET_BANDS") {
    if (value.evaluationTypeCode !== "LOWER_IS_BETTER") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "ZERO_TARGET_BANDS requires LOWER_IS_BETTER" });
    const bands = Array.isArray(config.bands) ? config.bands as Array<Record<string, unknown>> : [];
    if (value.goal !== 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["goal"], message: "ZERO_TARGET_BANDS requires Goal = 0" });
    const malformed = !bands.length || bands.some((band) => typeof band.minResult !== "number" || typeof band.compliance !== "number" || Number(band.compliance) < 0 || Number(band.compliance) > 100 || band.maxResult !== undefined && (typeof band.maxResult !== "number" || Number(band.maxResult) < Number(band.minResult)));
    const ordered = malformed ? [] : [...bands].sort((left, right) => Number(left.minResult) - Number(right.minResult));
    const overlaps = ordered.some((band, index) => index > 0 && Number(ordered[index - 1]!.maxResult ?? Number.POSITIVE_INFINITY) >= Number(band.minResult));
    const coversZero = ordered.some((band) => Number(band.minResult) <= 0 && Number(band.maxResult ?? Number.POSITIVE_INFINITY) >= 0);
    if (malformed || overlaps || !coversZero) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig", "bands"], message: "ZERO_TARGET_BANDS requires non-overlapping explicit bands including Result = 0" });
  } else if (value.scoringMethod === "TOLERANCE") {
    if (value.evaluationTypeCode !== "EQUAL_IS_BETTER") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "TOLERANCE requires EQUAL_IS_BETTER" });
    if (typeof config.tolerance !== "number" || config.tolerance < 0 || !Array.isArray(config.bands) || !config.bands.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "TOLERANCE requires a non-negative tolerance and outside-tolerance bands" });
  } else if (value.scoringMethod === "RANGE_BASED") {
    if (value.evaluationTypeCode !== "RANGE") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "RANGE_BASED requires RANGE evaluation" });
    if (typeof config.rangeMin !== "number" || typeof config.rangeMax !== "number" || config.rangeMin > config.rangeMax || !Array.isArray(config.bands) || !config.bands.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "RANGE_BASED requires rangeMin, rangeMax and outside-range bands" });
  } else if (value.scoringMethod === "BINARY" || value.scoringMethod === "MILESTONE") context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringMethod"], message: `${value.scoringMethod} is not approved for Scoring V1` });
});
export type KpiConfigurationBody = z.infer<typeof kpiConfigurationBodySchema>;
export type BatchLookupKpiConfigurationsBody = z.infer<typeof batchLookupKpiConfigurationsBodySchema>;
export type EffectiveKpiConfigurationSnapshotsBody = z.infer<typeof effectiveKpiConfigurationSnapshotsBodySchema>;
export type InternalKpiConfigurationCatalogQuery = z.infer<typeof internalKpiConfigurationCatalogQuerySchema>;

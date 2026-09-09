import { additiveResultError } from "../contracts/additive-results.js";
import { validResultBands } from "../contracts/result-bands.js";
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
const evaluationTypeCode = z.enum(["GREATER_IS_BETTER","HIGHER_IS_BETTER","LOWER_IS_BETTER","ZERO_IS_BETTER","EQUAL_IS_BETTER","RANGE"]);
const scoringMethod = z.enum(["PROPORTIONAL","ZERO_TARGET_BANDS","RESULT_BANDS","TOLERANCE","RANGE_BASED","BINARY","MILESTONE"]);
const scoringApprovalStatus = z.enum(["PROPOSED","BLOCKED","APPROVED","NEEDS_REDEFINITION"]);
const negativeResultPolicy = z.enum(["ALLOW","DISALLOW","REVIEW"]);
const scoringRuleConfig = z.record(z.string(), z.unknown()).nullable();
const periodScope = z.enum(["CURRENT_PERIOD", "SAME_PERIOD_PREVIOUS_YEAR", "PREVIOUS_PERIOD"]);
const goalMode = z.enum(["SINGLE", "BY_SUBJECT"]);
const evaluationScope = z.enum(["OVERALL", "BY_SUBJECT"]);
const goalType = z.literal("SINGLE_VALUE");
const goalAssignment = z.enum(["SAME_GOAL_FOR_ALL", "DIFFERENT_GOAL_PER_SUBJECT"]);
const resultMethod = z.enum(["DIRECT", "CALCULATED_FROM_INPUTS"]);
const targetKind = z.enum(["ABSOLUTE_TARGET", "CHANGE_TARGET", "UPPER_LIMIT", "LOWER_LIMIT", "DEADLINE"]);
const subjectType = z.string().trim().min(1).max(30);
const subjectGoal = z.object({
  subjectExternalId: z.string().trim().min(1).max(100),
  subjectCode: z.string().trim().max(100).nullable().optional().default(null),
  subjectLabel: z.string().trim().min(1).max(200),
  goal: z.number().finite(),
  goalUnit: z.string().trim().min(1).max(50).optional(),
  resultUnit: z.string().trim().min(1).max(50).optional(),
}).strict();
const measurementInput = z.object({
  name: z.string().trim().min(1).max(160),
  unit: z.string().trim().min(1).max(50),
  description: z.string().trim().max(500).optional().default(""),
}).strict();
const subjectSelection = subjectGoal.omit({ goal: true, goalUnit: true, resultUnit: true });
const calculationTemplate = z.enum(["DIVIDE", "PERCENT_RATIO", "SUM", "AVERAGE", "DIFFERENCE"]);
const groupGoal = z.object({
  value: z.number().finite(),
  unit: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1).max(200),
}).strict();
export const kpiConfigurationBodySchema = z.object({
  definitionId: z.union([id, z.number().int().positive().transform(String)]), goal: z.number().finite(),
  measurementUnit: z.string().trim().max(50).default(""), dataSource: z.string().trim().min(1).max(120), ranges: kpiConfigurationRangesSchema,
  isActive: z.boolean().default(true),
  inputFrequencyCode: z.string().trim().min(1).max(50).default("MONTHLY"),
  periodScope: periodScope.default("CURRENT_PERIOD"), goalMode: goalMode.default("SINGLE"),
  evaluationScope: evaluationScope.default("OVERALL"),
  entityEvaluationMode: z.enum(["INDIVIDUAL", "CONTRIBUTE_TO_OVERALL"]).nullable().optional(),
  goalType: goalType.default("SINGLE_VALUE"),
  goalAssignment: goalAssignment.nullable().optional().default(null),
  goalUnit: z.string().trim().min(1).max(50).optional(),
  resultMethod: resultMethod.default("DIRECT"),
  measurementInputs: z.array(measurementInput).max(20).optional().default([]),
  calculationTemplate: calculationTemplate.nullable().optional().default(null),
  targetKind: targetKind.nullable().optional().default(null),
  rangeMinGoal: z.number().finite().nullable().optional().default(null), rangeMaxGoal: z.number().finite().nullable().optional().default(null),
  subjectType: subjectType.nullable().optional().default(null), subjectGoals: z.array(subjectGoal).max(500).optional().default([]),
  subjects: z.array(subjectSelection).max(500).optional().default([]),
  groupGoal: groupGoal.nullable().optional(),
  comparisonDirection: z.enum(["INCREASE", "REDUCTION"]).nullable().optional().default(null),
  calculationPattern: z.enum(["DIRECT", "DERIVED", "MULTI_INPUT_CURRENT_PERIOD", "COMPOSITE", "COMPARATIVE"]).nullable().optional().default(null),
  resultSemantics: resultSemantics.nullable().optional().default(null), evaluationTypeCode: evaluationTypeCode.nullable().optional().default(null),
  scoringMethod: scoringMethod.nullable().optional().default(null), scoringRuleConfig: scoringRuleConfig.optional().default(null),
  scoringRuleConfigVersion: z.number().int().positive().nullable().optional().default(null), negativeResultPolicy: negativeResultPolicy.nullable().optional().default(null),
  scoringApprovalStatus: scoringApprovalStatus.optional().default("BLOCKED"),
  effectiveFrom: dateOnly.optional(),
  changeReason: z.string().trim().max(500).optional(),
}).strict().superRefine((value, context) => {
  const effectiveScope = value.evaluationScope === "BY_SUBJECT" || value.goalMode === "BY_SUBJECT" ? "BY_SUBJECT" : "OVERALL";
  const contributing = effectiveScope === "BY_SUBJECT" && value.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL";
  if (value.entityEvaluationMode && effectiveScope !== "BY_SUBJECT") context.addIssue({ code: z.ZodIssueCode.custom, path: ["entityEvaluationMode"], message: "Entity participation applies to By Entity only" });
  if (contributing) {
    if (additiveResultError(value.resultSemantics, value.measurementUnit)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementUnit"], message: "SUM requires an additive count or absolute quantity in a supported unit; percentages, ratios, unit costs and durations cannot be summed" });
    if (value.subjectGoals.length || value.goalAssignment != null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals"], message: "Contributors have no individual targets or goal assignment" });
    if (value.resultMethod !== "DIRECT") context.addIssue({ code: z.ZodIssueCode.custom, path: ["resultMethod"], message: "Contributors enter result values in one common unit; aggregation is SUM" });
  }
  if (effectiveScope === "BY_SUBJECT") {
    if (!value.subjectType) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectType"], message: "Select a subject type first" });
    if (!value.subjects.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjects"], message: "Select at least one entity" });
    if (new Set(value.subjects.map((item) => item.subjectExternalId)).size !== value.subjects.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjects"], message: "Each subject can only appear once" });
    if (!contributing && value.goalAssignment === "DIFFERENT_GOAL_PER_SUBJECT" && value.subjectGoals.length !== value.subjects.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals"], message: "Every selected subject requires a Goal" });
    const rowIds = value.subjectGoals.map(item => item.subjectExternalId);
    if (new Set(rowIds).size !== rowIds.length || rowIds.some(id => !value.subjects.some(s => s.subjectExternalId === id))) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals"], message: "Entity Goals must match the selected entities exactly" });
    const perEntityUnits = !contributing && (value.subjectGoals.some(item => item.goalUnit !== undefined || item.resultUnit !== undefined) || !value.measurementUnit);
    if (perEntityUnits && value.subjectGoals.length !== value.subjects.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals"], message: "Every entity requires its own units" });
    value.subjectGoals.forEach((item, index) => {
      if (perEntityUnits && !item.goalUnit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals", index, "goalUnit"], message: "Select a Goal Unit for this entity" });
      if (value.periodScope === "CURRENT_PERIOD" && item.resultUnit && item.resultUnit !== (item.goalUnit ?? value.goalUnit ?? value.measurementUnit)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals", index, "resultUnit"], message: "Current Result Unit must match this entity's Goal Unit" });
      if (value.periodScope !== "CURRENT_PERIOD" && ((item.goalUnit ?? value.goalUnit ?? "%") !== "%" || !(item.resultUnit ?? value.measurementUnit) || (item.resultUnit ?? value.measurementUnit) === "%")) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals", index, "resultUnit"], message: "Historical entities require a % target and an actual Result Unit" });
      if (value.goalAssignment === "SAME_GOAL_FOR_ALL" && item.goal !== value.goal) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectGoals", index, "goal"], message: "The common Goal must match every entity Goal" });
    });
  }
  if ((effectiveScope === "OVERALL" || contributing) && !value.measurementUnit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementUnit"], message: "Select the Result Unit" });
  if (effectiveScope !== "BY_SUBJECT" && value.groupGoal) context.addIssue({ code: z.ZodIssueCode.custom, path: ["groupGoal"], message: "Group Goal is available with By Entity only" });
  if (!contributing && value.evaluationScope === "BY_SUBJECT" && value.goalMode !== "BY_SUBJECT" && !value.goalAssignment) context.addIssue({ code: z.ZodIssueCode.custom, path: ["goalAssignment"], message: "Goal Assignment is required for By Subject evaluation" });
  if (value.resultMethod === "DIRECT" && value.measurementInputs.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementInputs"], message: "Direct Result cannot define Measurement Inputs" });
  if (value.resultMethod === "CALCULATED_FROM_INPUTS" && value.measurementInputs.length < 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementInputs"], message: "Calculated Result requires at least two Measurement Inputs" });
  if (value.resultMethod === "CALCULATED_FROM_INPUTS" && value.calculationPattern !== "DERIVED") context.addIssue({ code: z.ZodIssueCode.custom, path: ["calculationPattern"], message: "Calculated Result uses the DERIVED canonical pattern in V1" });
  if (value.resultMethod === "CALCULATED_FROM_INPUTS" && !value.calculationTemplate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["calculationTemplate"], message: "Select a deterministic Calculation Template" });
  if (value.resultMethod === "DIRECT" && value.calculationTemplate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["calculationTemplate"], message: "Direct Result cannot define a Calculation Template" });
  if (value.calculationTemplate === "DIVIDE" && value.measurementInputs.length !== 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementInputs"], message: "DIVIDE requires exactly two inputs" });
  if (value.calculationTemplate === "DIFFERENCE" && value.measurementInputs.length !== 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementInputs"], message: "DIFFERENCE requires exactly two inputs" });
  if (value.periodScope === "CURRENT_PERIOD" && value.targetKind === "CHANGE_TARGET") context.addIssue({ code: z.ZodIssueCode.custom, path: ["periodScope"], message: "A percentage change requires Previous Period or Same Period Previous Year" });
  if ((effectiveScope === "OVERALL" || contributing) && value.periodScope !== "CURRENT_PERIOD" && value.targetKind === "CHANGE_TARGET" && (value.goalUnit ?? "%") === "%" && value.measurementUnit === "%") context.addIssue({ code: z.ZodIssueCode.custom, path: ["measurementUnit"], message: "Select the unit of the actual measured Result; % represents the historical target change" });
  if (contributing && value.periodScope === "CURRENT_PERIOD" && (value.goalUnit ?? value.measurementUnit) !== value.measurementUnit) context.addIssue({code:z.ZodIssueCode.custom,path:["measurementUnit"],message:"Contributors and the official current-period target must use the same unit"});
  if (value.scoringApprovalStatus !== "APPROVED") return;
  if (!value.targetKind) context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetKind"], message: "Confirm the target kind before approving this configuration" });
  if (value.resultMethod !== "DIRECT" && !(value.calculationTemplate === "DIVIDE" && value.measurementInputs.length === 2)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["resultMethod"], message: "Monitoring currently requires the actual Result to be entered directly" });
  if (!["PROPORTIONAL", "ZERO_TARGET_BANDS", "RESULT_BANDS", "BINARY"].includes(value.scoringMethod ?? "")) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringMethod"], message: "This evaluation method is not executable by Monitoring yet" });
  if (value.periodScope !== "CURRENT_PERIOD" && (value.targetKind !== "CHANGE_TARGET" || !value.comparisonDirection || !["PROPORTIONAL", "RESULT_BANDS"].includes(value.scoringMethod ?? ""))) context.addIssue({ code: z.ZodIssueCode.custom, path: ["comparisonDirection"], message: "Historical evaluation requires a change target, direction and proportional scoring" });
  for (const [field, configured] of [["resultSemantics", value.resultSemantics], ["evaluationTypeCode", value.evaluationTypeCode], ["scoringMethod", value.scoringMethod], ["negativeResultPolicy", value.negativeResultPolicy], ["scoringRuleConfigVersion", value.scoringRuleConfigVersion]] as const) {
    if (configured === null) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required before scoring can be APPROVED` });
  }
  const config = value.scoringRuleConfig as Record<string, unknown> | null;
  const evaluatedGoals = !contributing && effectiveScope === "BY_SUBJECT" && value.goalAssignment === "DIFFERENT_GOAL_PER_SUBJECT" ? value.subjectGoals.map(row => row.goal) : [value.goal];
  if (!config) { context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "scoringRuleConfig is required before scoring can be APPROVED" }); return; }
  if (value.scoringMethod === "PROPORTIONAL") {
    if (value.evaluationTypeCode !== "GREATER_IS_BETTER" && value.evaluationTypeCode !== "HIGHER_IS_BETTER" && value.evaluationTypeCode !== "LOWER_IS_BETTER" && !(value.periodScope !== "CURRENT_PERIOD" && value.evaluationTypeCode === "ZERO_IS_BETTER")) context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "PROPORTIONAL requires Greater or Lower behavior, or a historical change target with Zero is best" });
    if (typeof config.floorPercent !== "number" || typeof config.capPercent !== "number" || config.floorPercent < 0 || config.capPercent > 100 || config.floorPercent > config.capPercent) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "PROPORTIONAL requires valid floorPercent and capPercent" });
    if (evaluatedGoals.some(goal => goal <= 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["goal"], message: "PROPORTIONAL requires Goal > 0 for every evaluation" });
  } else if (value.scoringMethod === "ZERO_TARGET_BANDS") {
    if (!["LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(value.evaluationTypeCode ?? "")) context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "Zero bands require Less is better or Zero is best" });
    const bands = Array.isArray(config.bands) ? config.bands as Array<Record<string, unknown>> : [];
    if (evaluatedGoals.some(goal => goal !== 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["goal"], message: "ZERO_TARGET_BANDS requires Goal = 0 for every evaluation" });
    const valid = validResultBands(bands);
    const coversZero = valid && bands.some(band => (band.minResult == null || Number(band.minResult) < 0 || Number(band.minResult) === 0 && band.includesMin !== false) && (band.maxResult == null || Number(band.maxResult) > 0 || Number(band.maxResult) === 0 && band.includesMax !== false));
    if (!valid || !coversZero) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig", "bands"], message: "ZERO_TARGET_BANDS requires non-overlapping explicit bands including Result = 0" });
  } else if (value.scoringMethod === "RESULT_BANDS") {
    if (!validResultBands(config.bands)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig", "bands"], message: "Define valid non-overlapping result bands with Compliance between 0 and 100" });
    if (!["HIGHER_IS_BETTER","GREATER_IS_BETTER","LOWER_IS_BETTER","ZERO_IS_BETTER"].includes(value.evaluationTypeCode ?? "")) context.addIssue({code:z.ZodIssueCode.custom,path:["evaluationTypeCode"],message:"Select a supported behavior for result bands"});
  } else if (value.scoringMethod === "BINARY") {
    if (value.resultSemantics !== "BINARY" || value.periodScope !== "CURRENT_PERIOD" || value.resultMethod !== "DIRECT") context.addIssue({code:z.ZodIssueCode.custom,path:["scoringMethod"],message:"Yes/No scoring requires a direct current-period binary result"});
  } else if (value.scoringMethod === "TOLERANCE") {
    if (value.evaluationTypeCode !== "EQUAL_IS_BETTER") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "TOLERANCE requires EQUAL_IS_BETTER" });
    if (typeof config.tolerance !== "number" || config.tolerance < 0 || !Array.isArray(config.bands) || !config.bands.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "TOLERANCE requires a non-negative tolerance and outside-tolerance bands" });
  } else if (value.scoringMethod === "RANGE_BASED") {
    if (value.evaluationTypeCode !== "RANGE") context.addIssue({ code: z.ZodIssueCode.custom, path: ["evaluationTypeCode"], message: "RANGE_BASED requires RANGE evaluation" });
    if (typeof config.rangeMin !== "number" || typeof config.rangeMax !== "number" || config.rangeMin > config.rangeMax || !Array.isArray(config.bands) || !config.bands.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringRuleConfig"], message: "RANGE_BASED requires rangeMin, rangeMax and outside-range bands" });
  } else if (value.scoringMethod === "MILESTONE") context.addIssue({ code: z.ZodIssueCode.custom, path: ["scoringMethod"], message: `${value.scoringMethod} is not approved for Scoring V1` });
});
export type KpiConfigurationBody = z.infer<typeof kpiConfigurationBodySchema>;
export type BatchLookupKpiConfigurationsBody = z.infer<typeof batchLookupKpiConfigurationsBodySchema>;
export type EffectiveKpiConfigurationSnapshotsBody = z.infer<typeof effectiveKpiConfigurationSnapshotsBodySchema>;
export type InternalKpiConfigurationCatalogQuery = z.infer<typeof internalKpiConfigurationCatalogQuerySchema>;

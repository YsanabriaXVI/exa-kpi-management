import { z } from "zod";
const externalId = z.string().regex(/^\d+$/);
const department = z.object({ externalDepartmentId: externalId, companyExternalId: externalId, code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(150) });
const collaborator = z.object({ externalEmployeeId: externalId, departmentExternalId: externalId, code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(220) });
export const createScorecardBodySchema = z.object({
  name: z.string().trim().min(1).max(200), description: z.string().trim().max(5000).nullable().optional(), kpiPoolExternalId: externalId,
  departments: z.array(department).min(1).superRefine((items, context) => { if (new Set(items.map((item) => item.externalDepartmentId)).size !== items.length) context.addIssue({ code: "custom", message: "Departments must be unique" }); }),
  collaborators: z.array(collaborator).default([]).superRefine((items, context) => { if (new Set(items.map((item) => item.externalEmployeeId)).size !== items.length) context.addIssue({ code: "custom", message: "Collaborators must be unique" }); }),
});
export const updateScorecardBodySchema = createScorecardBodySchema.pick({ name: true, description: true, departments: true, collaborators: true }).partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const scorecardIdParamsSchema = z.object({ id: externalId });
export const scorecardPeriodParamsSchema = z.object({ id: externalId, periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
export const scorecardPeriodKpiParamsSchema = scorecardPeriodParamsSchema.extend({ configurationId: externalId });
export const scorecardPeriodLinkParamsSchema = scorecardPeriodParamsSchema.extend({ linkedScorecardId: externalId });
const weight = z.coerce.number().nonnegative().max(100).multipleOf(0.0001);
export const addPeriodKpisBodySchema = z.object({ items: z.array(z.object({ poolMembershipExternalId: externalId, weight })).min(1) });
export const updatePeriodWeightsBodySchema = z.object({ kpis: z.array(z.object({ kpiConfigurationExternalId: externalId, weight })), linkedScorecards: z.array(z.object({ linkedScorecardId: externalId, weight })) });
export const addPeriodLinkBodySchema = z.object({ linkedScorecardId: externalId, weight });
export const poolWorkflowQuerySchema = z.object({ poolId: externalId, periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
export const poolUsageBatchBodySchema = z.object({ targets: z.array(z.object({ poolId: externalId, periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })).min(1).max(100) });
const repeatedIds = z.preprocess((value) => value === undefined ? undefined : Array.isArray(value) ? value : [value], z.array(externalId).optional());
const repeatedText = z.preprocess((value) => value === undefined ? undefined : Array.isArray(value) ? value : [value], z.array(z.string().trim().min(1).max(150)).optional());
const repeatedYears = z.preprocess((value) => value === undefined ? undefined : Array.isArray(value) ? value : [value], z.array(z.coerce.number().int().min(2000).max(2200)).optional());
export const listScorecardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(100).default(10), search: z.string().trim().max(200).optional(),
  status: z.preprocess((value) => value === undefined ? undefined : Array.isArray(value) ? value : [value], z.array(z.enum(["DRAFT", "ACTIVE", "INACTIVE"])).optional()), poolId: repeatedIds, companyId: repeatedIds, department: repeatedText, frequency: repeatedText, year: repeatedYears,
  sortBy: z.enum(["scorecardCode", "scorecardName", "statusCode", "createdAt", "updatedAt"]).default("createdAt"), sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type CreateScorecardBody = z.infer<typeof createScorecardBodySchema>;
export type UpdateScorecardBody = z.infer<typeof updateScorecardBodySchema>;
export type ListScorecardsQuery = z.infer<typeof listScorecardsQuerySchema>;

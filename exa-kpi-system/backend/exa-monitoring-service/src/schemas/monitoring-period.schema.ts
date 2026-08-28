import { z } from "zod"; const id=z.string().regex(/^[1-9]\d*$/); export const materializeMonitoringPeriodBodySchema=z.object({poolId:id,poolInputPeriodId:id}).strict(); export type MaterializeMonitoringPeriodBody=z.infer<typeof materializeMonitoringPeriodBodySchema>;

export const monitoringPeriodIdParamsSchema = z.object({ id });
export const poolIdParamsSchema = z.object({ poolId: id });
const csv = z.preprocess((value) => typeof value === "string" ? value.split(",").filter(Boolean) : value, z.array(z.string()).optional()).default([]);
export const monitoringListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(), status: csv, frequency: csv, company: csv,
  year: z.coerce.number().int().min(2000).max(2100).optional(), month: csv,
  sortBy: z.enum(["periodStart","poolCode","poolName","status","frequency","expected","entered"]).default("periodStart"),
  sortOrder: z.enum(["asc","desc"]).default("desc"),
}).strict();
export const attachedScorecardsQuerySchema = z.object({
  page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(10),search:z.string().trim().max(200).optional(),
  department:csv,entryStatus:csv,sortBy:z.enum(["code","name","entryStatus","expected","entered","previewScore"]).default("code"),sortOrder:z.enum(["asc","desc"]).default("asc")
}).strict();
export const detailInputsQuerySchema = z.object({
  page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(10),search:z.string().trim().max(200).optional(),
  entryStatus:csv,validation:csv,trafficLight:csv,unit:csv,sortBy:z.enum(["kpiCode","kpiName","unit","goal","result","score","trafficLight"]).default("kpiCode"),sortOrder:z.enum(["asc","desc"]).default("asc")
}).strict();
export const scheduleQuerySchema=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(10),search:z.string().trim().max(200).optional(),status:csv,validation:csv,sortBy:z.enum(["periodStart","expected","entered","pending","status","closedAt"]).default("periodStart"),sortOrder:z.enum(["asc","desc"]).default("asc")}).strict();
export type MonitoringListQuery=z.infer<typeof monitoringListQuerySchema>; export type AttachedScorecardsQuery=z.infer<typeof attachedScorecardsQuerySchema>; export type DetailInputsQuery=z.infer<typeof detailInputsQuerySchema>; export type ScheduleQuery=z.infer<typeof scheduleQuerySchema>;

const decimalValue = z.string().trim()
  .regex(/^-?\d+(\.\d+)?$/, "RESULT_NOT_NUMERIC")
  .refine((value) => {
    const unsigned = value.startsWith("-") ? value.slice(1) : value;
    const [integer = "", fraction = ""] = unsigned.split(".");
    return integer.replace(/^0+(?=\d)/, "").length <= 14 && fraction.length <= 6;
  }, "RESULT_PRECISION_EXCEEDED")
  .nullable();

export const saveResultEntryBodySchema = z.object({
  changes: z.array(z.object({
    monitoringPeriodInputId: id,
    resultValue: decimalValue,
    comment: z.string().max(10_000).nullable(),
    version: z.number().int().positive().nullable(),
  }).strict()).min(1),
}).strict();

export type SaveResultEntryBody = z.infer<typeof saveResultEntryBodySchema>;

export const workflowVersionBodySchema = z.object({ version: z.number().int().positive() }).strict();
export const returnForCorrectionBodySchema = workflowVersionBodySchema.extend({ reason: z.string().trim().min(10).max(10_000) }).strict();
export const closeMonitoringPeriodBodySchema = workflowVersionBodySchema.extend({ withExceptions: z.boolean().default(false), justification: z.string().trim().max(10_000).nullable().default(null) }).strict().superRefine((value, context) => {
  if (value.withExceptions && (!value.justification || value.justification.length < 10)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["justification"], message: "Close with Exceptions requires a justification of at least 10 characters" });
});
export type WorkflowVersionBody = z.infer<typeof workflowVersionBodySchema>;
export type ReturnForCorrectionBody = z.infer<typeof returnForCorrectionBodySchema>;
export type CloseMonitoringPeriodBody = z.infer<typeof closeMonitoringPeriodBodySchema>;

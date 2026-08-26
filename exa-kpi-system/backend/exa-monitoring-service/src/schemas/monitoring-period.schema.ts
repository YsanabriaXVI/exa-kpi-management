import { z } from "zod"; const id=z.string().regex(/^[1-9]\d*$/); export const materializeMonitoringPeriodBodySchema=z.object({poolId:id,poolInputPeriodId:id}).strict(); export type MaterializeMonitoringPeriodBody=z.infer<typeof materializeMonitoringPeriodBodySchema>;

export const monitoringPeriodIdParamsSchema = z.object({ id });

const decimalValue = z.string().trim().regex(/^-?\d+(\.\d+)?$/).max(40).nullable();

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

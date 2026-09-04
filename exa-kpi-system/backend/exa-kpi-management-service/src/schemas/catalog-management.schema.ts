import { z } from "zod";

const code = z.string().trim().min(2).max(50).regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Use uppercase letters, numbers, hyphens or underscores.");
const name = z.string().trim().min(2).max(120);
const description = z.string().trim().max(1000).nullable().optional();

export const catalogIdParamsSchema = z.object({ id: z.coerce.string().regex(/^\d+$/) });
export const catalogUsageParamsSchema = z.object({ kind: z.enum(["subject-type", "subject-value", "measurement-unit", "data-source"]), id: z.string().regex(/^\d+$/) });
export const subjectTypeCodeParamsSchema = z.object({ code: code.max(30) });
export const subjectTypeBodySchema = z.object({ code: code.max(30), name });
export const subjectValueBodySchema = z.object({ code: code.max(100), name: name.max(200) });
export const measurementUnitBodySchema = z.object({
  code,
  symbol: z.string().trim().min(1).max(50),
  name,
  description,
  decimalPlaces: z.coerce.number().int().min(0).max(8).default(2),
  isPercentage: z.boolean().default(false),
});
export const dataSourceBodySchema = z.object({
  code,
  name,
  description,
  sourceType: code.max(30),
  isExternal: z.boolean().default(false),
  supportsAutomation: z.boolean().default(false),
});

export type SubjectTypeBody = z.infer<typeof subjectTypeBodySchema>;
export type SubjectValueBody = z.infer<typeof subjectValueBodySchema>;
export type MeasurementUnitBody = z.infer<typeof measurementUnitBodySchema>;
export type DataSourceBody = z.infer<typeof dataSourceBodySchema>;

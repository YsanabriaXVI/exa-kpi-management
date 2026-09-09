import { z } from "zod";
export const bandStartSchema = z.string().trim()
  .regex(/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)\+?$/, "Ingresa un numero o decimal, con + al final para indicar en adelante.")
  .transform(value => ({ minResult: Number(value.replace(/\+$/, "").replace(",", ".")), onward: value.endsWith("+") }))
  .refine(value => Number.isFinite(value.minResult), "Ingresa un numero finito.");
export type ResultBand = { minResult: number | null; maxResult?: number | null; compliance: number; includesMin?: boolean; includesMax?: boolean };
export const resultBandsSchema = z.array(z.object({
  minResult: z.number().finite().nullable(),
  maxResult: z.number().finite().nullable().optional(),
  compliance: z.number().finite().min(0).max(100),
  includesMin: z.boolean().optional(),
  includesMax: z.boolean().optional(),
})).min(1).superRefine((bands, context) => {
  const sorted = bands.map((band, index) => ({ ...band, index })).sort((a, b) => (a.minResult ?? -Infinity) - (b.minResult ?? -Infinity));
  sorted.forEach((band, index) => {
    if (band.maxResult != null && band.minResult != null && (band.maxResult < band.minResult || band.maxResult === band.minResult && (band.includesMin === false || band.includesMax === false)))
      context.addIssue({ code: z.ZodIssueCode.custom, path: [band.index, "maxResult"], message: "Hasta debe ser mayor o igual que Desde." });
    const previous = sorted[index - 1];
    if (previous && (previous.maxResult == null || band.minResult == null || previous.maxResult > band.minResult || previous.maxResult === band.minResult && previous.includesMax !== false && band.includesMin !== false))
      context.addIssue({ code: z.ZodIssueCode.custom, path: [band.index, "minResult"], message: "Esta banda se superpone con otra. Revisa los límites y qué extremos se incluyen." });
  });
});
export function validResultBands(value: unknown): value is ResultBand[] { return resultBandsSchema.safeParse(value).success; }

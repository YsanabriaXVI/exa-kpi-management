import { Prisma } from "@prisma/client";

export type DivisionValues = { numerator: string | null; denominator: string | null };
export function divisionDefinition(settings: any): Array<{ name: string; unit: string }> | null {
  if (settings?.resultMethod !== "CALCULATED_FROM_INPUTS") return null;
  if (settings.calculationTemplate !== "DIVIDE" || !Array.isArray(settings.measurementInputs) || settings.measurementInputs.length !== 2 || settings.measurementInputs.some((input: any) => !input.name?.trim() || !input.unit?.trim())) return null;
  return settings.measurementInputs;
}
export function calculateDivision(values: DivisionValues | null | undefined): { value: Prisma.Decimal | null; errorCode: string | null } {
  if (values?.numerator == null || values.denominator == null) return { value: null, errorCode: "RESULT_INPUT_MISSING" };
  try {
    const numerator = new Prisma.Decimal(values.numerator), denominator = new Prisma.Decimal(values.denominator);
    if (!numerator.isFinite() || !denominator.isFinite()) return { value: null, errorCode: "RESULT_INPUT_INVALID" };
    if (denominator.isZero()) return { value: null, errorCode: "RESULT_DENOMINATOR_ZERO" };
    const value = numerator.div(denominator).toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
    if (!value.isFinite() || value.abs().gte("100000000000000")) return { value: null, errorCode: "RESULT_PRECISION_EXCEEDED" };
    return { value, errorCode: null };
  } catch { return { value: null, errorCode: "RESULT_INPUT_INVALID" }; }
}

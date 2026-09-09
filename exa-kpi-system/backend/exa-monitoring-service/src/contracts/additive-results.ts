// SUM is supported only for explicit additive measurements. Unknown units fail closed.
// Keep this contract identical in the service packages and the configuration UI.
const additiveUnits = new Set([
  "USD", "EUR", "HNL", "MXN", "COUNT", "UNITS", "UNIT", "INCIDENTS", "CONTAINERS",
  "KM", "KMS", "KILOMETERS", "THOUSANDS_KM", "THOUSAND KM", "M", "METERS",
  "KG", "KILOGRAMS", "TON", "TONS", "TONNES", "L", "LITERS", "GALLON", "GALLONS", "GAL",
]);
type ResultUnit = string | { code?: string; symbol?: string; isPercentage?: boolean } | null | undefined;
export function additiveResultError(semantics: unknown, unit: ResultUnit): string | null {
  if (semantics !== "ABSOLUTE_VALUE" && semantics !== "COUNT") return "SUM_REQUIRES_ADDITIVE_RESULT";
  const identifiers = typeof unit === "string" ? [unit] : [unit?.code, unit?.symbol].filter((v): v is string => Boolean(v));
  if (typeof unit === "object" && unit?.isPercentage || !identifiers.length
    || identifiers.some(value => !additiveUnits.has(value.trim().toUpperCase()))) return "SUM_REQUIRES_ADDITIVE_RESULT";
  return null;
}

const DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Produces a stable internal representation for matching and deterministic rules.
 * The returned value is never a replacement for the user-authored KPI name.
 */
export function normalizeDefinitionText(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLocaleLowerCase("es")
    .replace(/&/g, " y ")
    .replace(/#/g, " numero ")
    .replace(/%/g, " porcentaje ")
    .replace(/[·•]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9/+.-]+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

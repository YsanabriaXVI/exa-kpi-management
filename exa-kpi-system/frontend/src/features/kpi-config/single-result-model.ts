import type { KpiConfigRecord } from "./kpi-config.types";
import type { ResultBand } from "./result-bands";

export const SINGLE_RESULT_MODEL = "SINGLE_RESULT_V1";
export const isSingleResultConfig = (config?: KpiConfigRecord) =>
  !config || config.scoringRuleConfig?.model === SINGLE_RESULT_MODEL;

export type BandDraft = { from: string; to: string; compliance: string; includesMin?: boolean; includesMax?: boolean };
const numeric = (value: string) => value.trim() ? Number(value) : NaN;
export const onwardValue = (value: string): number | null => {
  const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:\+|o m[aá]s|or higher)$/i);
  return match && Number.isFinite(Number(match[1])) ? Number(match[1]) : null;
};
export const lowerValue = (value: string): number | null => {
  const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:o menos|or lower)$/i);
  return match && Number.isFinite(Number(match[1])) ? Number(match[1]) : null;
};
export function pointSuggestions(value: string, first: boolean, last: boolean): string[] {
  const match = value.trim().match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)/);
  if (!match || !Number.isFinite(Number(match[0]))) return [];
  const n = match[0];
  return [n, ...(first ? [`${n} o menos`, `${n} or lower`] : []),
    ...(last && Number(n) >= 0 ? [`${n}+`, `${n} o más`, `${n} or higher`] : [])];
}
// Every shared boundary belongs to the interval on its left. The first
// finite lower boundary is included, including a singleton such as [0, 0].
export function buildResultIntervals(rows: BandDraft[]): ResultBand[] {
  return rows.map((row, i) => {
    const from = row.from;
    return { minResult: from.trim() ? numeric(from) : null,
      maxResult: row.to.trim() ? numeric(row.to) : null,
      compliance: numeric(row.compliance), includesMin: row.includesMin ?? i === 0,
      includesMax: row.includesMax ?? true };
  });
}
// Singleton bounds encode exact equality, never inferred ranges between points.
export function buildResultPoints(rows: BandDraft[]): ResultBand[] {
  return rows.map(row => {
    const onward = onwardValue(row.to);
    const lower = lowerValue(row.to);
    const result = onward ?? lower ?? numeric(row.to);
    return { minResult: lower === null ? result : null, maxResult: onward === null ? result : null,
      compliance: numeric(row.compliance), includesMin: true, includesMax: true };
  });
}
export function pointValuesError(rows: BandDraft[], allowNegative: boolean): string | null {
  if (!rows.length) return "Agrega al menos un valor puntual.";
  const values = rows.map(row => onwardValue(row.to) ?? lowerValue(row.to) ?? numeric(row.to));
  if (values.some((value, i) => !Number.isFinite(value) || (!allowNegative && value < 0) ||
    (i > 0 && value <= values[i - 1]))) return "Ingresa resultados numéricos únicos en orden ascendente.";
  if (rows.some((row, i) => onwardValue(row.to) !== null && (i !== rows.length - 1 || values[i] < 0)))
    return "N+ solo puede aparecer en la última fila y debe ser no negativo.";
  if (rows.some((row, i) => lowerValue(row.to) !== null && i !== 0))
    return "N o menos solo puede aparecer en la primera fila.";
  return null;
}
export function intervalCoverageError(bands: ResultBand[], allowNegative: boolean): string | null {
  if (!bands.length) return "Agrega al menos un intervalo.";
  if (bands[0].minResult !== null && (allowNegative || bands[0].minResult! > 0)) return "Las bandas deben cubrir todos los resultados permitidos desde el primer intervalo.";
  if (bands[bands.length - 1].maxResult != null) return "Deja el último Hasta vacío para cubrir resultados mayores.";
  if (bands.some((band, i) => i > 0 && (bands[i - 1].maxResult == null || band.minResult !== bands[i - 1].maxResult))) return "Los intervalos deben ser consecutivos, sin huecos.";
  return null;
}

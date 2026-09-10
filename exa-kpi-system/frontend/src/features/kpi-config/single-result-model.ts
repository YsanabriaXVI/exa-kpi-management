import type { KpiConfigRecord } from "./kpi-config.types";
import type { ResultBand } from "./result-bands";

export const SINGLE_RESULT_MODEL = "SINGLE_RESULT_V1";
export const isSingleResultConfig = (config?: KpiConfigRecord) =>
  !config || config.scoringRuleConfig?.model === SINGLE_RESULT_MODEL;

export type BandDraft = { from: string; to: string; compliance: string };
const numeric = (value: string) => value.trim() ? Number(value) : NaN;
export const onwardValue = (value: string): number | null => {
  const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\+$/);
  return match && Number.isFinite(Number(match[1])) ? Number(match[1]) : null;
};
// Every shared boundary belongs to the interval on its left. The first
// finite lower boundary is included, including a singleton such as [0, 0].
export function buildResultIntervals(rows: BandDraft[], levels: boolean): ResultBand[] {
  return rows.map((row, i) => {
    const onward = levels ? onwardValue(row.to) : null;
    if (onward !== null) return { minResult: onward, maxResult: null, compliance: numeric(row.compliance), includesMin: true, includesMax: true };
    const from = levels ? (i === 0 ? "" : rows[i - 1].to) : row.from;
    return { minResult: from.trim() ? numeric(from) : null,
      maxResult: row.to.trim() ? numeric(row.to) : null,
      compliance: numeric(row.compliance), includesMin: i === 0,
      includesMax: !(levels && i + 1 < rows.length && onwardValue(rows[i + 1].to) === numeric(row.to)) };
  });
}
export function intervalCoverageError(bands: ResultBand[], allowNegative: boolean): string | null {
  if (!bands.length) return "Agrega al menos un intervalo.";
  if (bands[0].minResult !== null && (allowNegative || bands[0].minResult! > 0)) return "Las bandas deben cubrir todos los resultados permitidos desde el primer intervalo.";
  if (bands[bands.length - 1].maxResult != null) return "Deja el último Hasta vacío para cubrir resultados mayores.";
  if (bands.some((band, i) => i > 0 && (bands[i - 1].maxResult == null || band.minResult !== bands[i - 1].maxResult))) return "Los intervalos deben ser consecutivos, sin huecos.";
  return null;
}

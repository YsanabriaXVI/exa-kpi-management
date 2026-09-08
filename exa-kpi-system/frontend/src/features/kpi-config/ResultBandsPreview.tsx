import { validResultBands, type ResultBand } from "./result-bands";
import type { TrafficLightRanges } from "./kpi-config.types";

export function ResultBandsPreview({ bands, ranges, complete, pointMode }: { bands: ResultBand[]; ranges?: TrafficLightRanges; complete: boolean; pointMode?: "STEP_POINTS" | "LINEAR_POINTS" }) {
  const valid = complete && validResultBands(bands);
  const levels = ranges ? [
    { name: "Rojo", color: "red", min: ranges.redFrom, max: ranges.redTo },
    { name: "Amarillo", color: "yellow", min: ranges.yellowFrom, max: ranges.yellowTo },
    { name: "Verde", color: "green", min: ranges.greenFrom, max: ranges.greenTo },
  ] : [];
  const previewBands = pointMode === "LINEAR_POINTS" && valid ? bands.flatMap((band, index) => {
    const next = bands[index + 1];
    return next ? [band, { minResult: (band.minResult + next.minResult) / 2, maxResult: (band.minResult + next.minResult) / 2, compliance: (band.compliance + next.compliance) / 2 }] : [band];
  }) : bands;
  const rangeLabel = (band: ResultBand) => {
    if (pointMode && band.maxResult !== undefined) return String(band.minResult);
    if (band.maxResult === band.minResult) return String(band.minResult);
    if (band.maxResult === undefined) return band.includesMin === false ? `Después de ${band.minResult}` : `${band.minResult}+`;
    return `${band.includesMin === false ? "Después de " : ""}${band.minResult} a ${band.maxResult}${band.includesMax === false ? " (sin incluir)" : ""}`;
  };
  return <section className="result-bands-preview" aria-label="Vista previa de bandas">
    <h4>Vista previa</h4>
    <p>Resultado → Cumplimiento → Traffic Light configurado</p>
    {!valid ? <p>Completa bandas válidas para ver su cumplimiento y color.</p> : <ul>{previewBands.map((band, index) => {
      const colorValue = Math.floor(band.compliance);
      const matches = levels.filter(level => colorValue >= Number(level.min) && colorValue <= Number(level.max));
      const level = matches.length === 1 ? matches[0] : undefined;
      return <li key={index}><strong>{rangeLabel(band)}</strong><span aria-hidden="true">→</span><span>{Number(band.compliance.toFixed(2))}%</span><span aria-hidden="true">→</span><span className={`band-traffic ${level?.color ?? "unconfigured"}`} title={level?.name ?? "Sin rango configurado"} aria-label={level?.name ?? "Sin rango configurado"}><i aria-hidden="true" style={{ backgroundColor: level?.color === "red" ? "#dc2626" : level?.color === "yellow" ? "#eab308" : level?.color === "green" ? "#16a34a" : "#94a3b8" }}/>{level?.name ?? "Sin rango configurado"}</span></li>;
    })}</ul>}
  </section>;
}

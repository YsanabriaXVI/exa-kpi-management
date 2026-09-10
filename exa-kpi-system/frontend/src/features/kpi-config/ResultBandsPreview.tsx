import { validResultBands, type ResultBand } from "./result-bands";
import type { TrafficLightRanges } from "./kpi-config.types";

export function ResultBandsPreview({ bands, ranges, complete, pointMode, unit, compact = false, complianceLevels = false }: { bands: ResultBand[]; ranges?: TrafficLightRanges; complete: boolean; unit?: string; pointMode?: "STEP_POINTS" | "LINEAR_POINTS"; compact?: boolean; complianceLevels?: boolean }) {
  const valid = complete && validResultBands(bands);
  const levels = ranges ? [
    { name: "Rojo", color: "red", min: ranges.redFrom, max: ranges.redTo },
    { name: "Amarillo", color: "yellow", min: ranges.yellowFrom, max: ranges.yellowTo },
    { name: "Verde", color: "green", min: ranges.greenFrom, max: ranges.greenTo },
  ] : [];
  const previewBands = pointMode === "LINEAR_POINTS" && valid ? bands.flatMap((band, index) => {
    const next = bands[index + 1];
    return next && band.minResult != null && next.minResult != null ? [band, { minResult: (band.minResult + next.minResult) / 2, maxResult: (band.minResult + next.minResult) / 2, compliance: (band.compliance + next.compliance) / 2 }] : [band];
  }) : [...bands].sort((a, b) => (a.minResult ?? -Infinity) - (b.minResult ?? -Infinity));
  const rangeLabel = (band: ResultBand) => {
    if (band.minResult == null && band.maxResult == null) return "Cualquier resultado";
    if (complianceLevels) return band.maxResult == null ? band.includesMin ? `${band.minResult} en adelante` : `Más de ${band.minResult}` : band.minResult === band.maxResult ? String(band.maxResult) : band.includesMax === false ? `Antes de ${band.maxResult}` : `Hasta ${band.maxResult}`;
    if (band.minResult == null) return `${band.includesMax === false ? "<" : "\u2264"} ${band.maxResult}`;
    if (band.maxResult == null) return `${band.includesMin === false ? ">" : "\u2265"} ${band.minResult}`;
    if (pointMode && band.maxResult !== undefined) return String(band.minResult);
    if (band.maxResult === band.minResult) return String(band.minResult);

    return `${band.minResult} ${band.includesMin === false ? "<" : "\u2264"} x ${band.includesMax === false ? "<" : "\u2264"} ${band.maxResult}`;
  };
  return <section className={`result-bands-preview ${compact ? "compact-bands-preview" : !pointMode ? "interval-visual-preview" : ""}`} aria-label="Vista previa de bandas">
    <h4>Vista previa</h4>
    <p>{compact ? "Así se calculará el cumplimiento según el resultado:" : pointMode ? "Resultado / Cumplimiento / Semaforo" : `Intervalos de resultado${unit ? ` (${unit})` : ""}. El porcentaje indica el cumplimiento asignado.`}</p>
    {!compact && !pointMode && valid && <p className="interval-legend">● Incluye el límite · ○ Excluye el límite · Flecha: sin límite. Barras esquemáticas, no a escala.</p>}
    {!valid ? <p>Completa bandas válidas para ver su cumplimiento y color.</p> : <ul>{previewBands.map((band, index) => {
      const colorValue = Math.floor(band.compliance);
      const matches = levels.filter(level => colorValue >= Number(level.min) && colorValue <= Number(level.max));
      const level = matches.length === 1 ? matches[0] : undefined;
      if (compact) return <li key={index}>
        <strong>{rangeLabel(band)} <span aria-hidden="true">→</span> {Number(band.compliance.toFixed(2))}%</strong>
        <span className={`band-traffic ${level?.color ?? "unconfigured"}`} title={level?.name ?? "Sin rango configurado"} aria-label={level?.name ?? "Sin rango configurado"}><i aria-hidden="true" style={{ backgroundColor: level?.color === "red" ? "#dc2626" : level?.color === "yellow" ? "#eab308" : level?.color === "green" ? "#16a34a" : "#94a3b8" }}/><span>{level?.name ?? "Sin rango configurado"}</span></span>
      </li>;
      if (!pointMode) return <li key={index} className={`interval-preview-item interval-color-${level?.color ?? "unconfigured"}`}>
        <div className="interval-preview-heading"><strong>{rangeLabel(band)}{unit ? ` ${unit}` : ""}</strong><b className="interval-compliance">{Number(band.compliance.toFixed(2))}%</b></div>
        <div className="interval-mini-bar" aria-hidden="true">
          <span className={`interval-endpoint ${band.minResult == null ? "unbounded" : band.includesMin === false ? "open" : "closed"}`}>{band.minResult == null ? "←" : ""}</span>
          <span className="interval-line"/>
          <span className={`interval-endpoint ${band.maxResult == null ? "unbounded" : band.includesMax === false ? "open" : "closed"}`}>{band.maxResult == null ? "→" : ""}</span>
        </div>
        <div className="interval-endpoint-labels" aria-hidden="true"><span>{band.minResult ?? "−∞"}</span><span>{band.maxResult ?? "+∞"}</span></div>
        <div className="interval-preview-footer"><span>Cumplimiento fijo</span><span className={`band-traffic ${level?.color ?? "unconfigured"}`}><i aria-hidden="true"/>{level?.name ?? "Sin rango configurado"}</span></div>
      </li>;
      return <li key={index}><strong>{rangeLabel(band)}</strong><span aria-hidden="true">→</span><span>{Number(band.compliance.toFixed(2))}%</span><span aria-hidden="true">→</span><span className={`band-traffic ${level?.color ?? "unconfigured"}`} title={level?.name ?? "Sin rango configurado"} aria-label={level?.name ?? "Sin rango configurado"}><i aria-hidden="true" style={{ backgroundColor: level?.color === "red" ? "#dc2626" : level?.color === "yellow" ? "#eab308" : level?.color === "green" ? "#16a34a" : "#94a3b8" }}/>{level?.name ?? "Sin rango configurado"}</span></li>;
    })}</ul>}
  </section>;
}

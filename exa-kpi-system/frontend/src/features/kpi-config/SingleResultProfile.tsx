import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { KpiConfigInput, KpiConfigRecord } from "./kpi-config.types";
import { ResultBandsPreview } from "./ResultBandsPreview";
import { validResultBands } from "./result-bands";
import { buildResultIntervals, intervalCoverageError, SINGLE_RESULT_MODEL, type BandDraft } from "./single-result-model";

export function useSingleResultProfile(input: KpiConfigInput | null, saved?: KpiConfigRecord, onZeroTarget?: () => void) {
  const [behavior, setBehavior] = useState("HIGHER_IS_BETTER");
  const [negative, setNegative] = useState(false);
  const [mode, setMode] = useState("NONE");
  const [rows, setRows] = useState<BandDraft[]>([]);
  useEffect(() => {
    setBehavior(saved?.evaluationTypeCode === "GREATER_IS_BETTER" ? "HIGHER_IS_BETTER" : saved?.evaluationTypeCode ?? "HIGHER_IS_BETTER");
    setNegative(saved?.negativeResultPolicy === "ALLOW");
    const intervals = !saved?.scoringRuleConfig?.bandMode || saved.scoringRuleConfig.bandMode === "INTERVALS";
    setMode(intervals && saved?.scoringRuleConfig?.bands?.length ? saved.scoringRuleConfig.editorMode ?? "INTERVALS" : "NONE");
    setRows((intervals ? saved?.scoringRuleConfig?.bands ?? [] : []).map(b => ({ from: b.minResult == null ? "" : String(b.minResult), to: b.maxResult == null ? saved?.scoringRuleConfig?.editorMode === "LEVELS" && b.includesMin && b.minResult != null ? `${b.minResult}+` : "" : String(b.maxResult), compliance: String(b.compliance) })));
  }, [saved, input?.definitionId]);
  const bands = buildResultIntervals(rows, mode === "LEVELS");
  const usesBands = mode !== "NONE";
  const reasons: string[] = [];
  if (!["HIGHER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(behavior)) reasons.push("Selecciona qué resultado es mejor para esta nueva revisión.");
  if (!input || !Number.isFinite(input.goal)) reasons.push("Ingresa la meta.");
  if (!input?.measurementUnit) reasons.push("Selecciona Goal Measurement Unit.");
  if (!input?.dataSource) reasons.push("Selecciona la fuente de datos.");
  if (!usesBands && negative && behavior === "LOWER_IS_BETTER") reasons.push("Usa bandas si Menos es mejor permite resultados negativos; la división proporcional no define ese caso.");
  if (!usesBands && (input?.goal == null || input.goal <= 0 || behavior === "ZERO_IS_BETTER")) reasons.push("Una meta de cero o negativa requiere bandas de resultado.");
  if (behavior === "ZERO_IS_BETTER" && input?.goal !== 0) reasons.push("Lo ideal es cero requiere Goal = 0.");
  if (usesBands) {
    if (!validResultBands(bands)) reasons.push("Completa los límites y el cumplimiento (0–100%) sin superponer intervalos.");
    const coverage = intervalCoverageError(bands, negative);
    if (coverage) reasons.push(coverage);
    if (validResultBands(bands)) {
      const higher = ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(behavior);
      if (behavior !== "ZERO_IS_BETTER" && bands.some((b, i) => i > 0 && (higher ? b.compliance < bands[i - 1].compliance : b.compliance > bands[i - 1].compliance))) reasons.push("El cumplimiento debe respetar qué resultado es mejor.");
      if (behavior === "ZERO_IS_BETTER" && !bands.some(b => (b.minResult == null || b.minResult < 0 || b.minResult === 0 && b.includesMin) && (b.maxResult == null || b.maxResult >= 0) && b.compliance === 100)) reasons.push("El resultado cero debe recibir 100% de cumplimiento.");
    }
  }
  const r = input?.ranges;
  if (!r || r.redFrom !== 0 || r.greenTo !== 100 || r.yellowFrom !== r.redTo + 1 || r.greenFrom !== r.yellowTo + 1 || r.redTo < 0 || r.yellowTo < r.yellowFrom || r.greenFrom > 100) reasons.push("Completa el semáforo de 0 a 100%.");
  const ready = reasons.length === 0;
  const fields = {
    evaluationTypeCode: behavior, resultSemantics: "ABSOLUTE_VALUE", comparisonDirection: null,
    targetKind: "ABSOLUTE_TARGET" as const, scoringMethod: usesBands ? "RESULT_BANDS" : "PROPORTIONAL",
    scoringRuleConfig: { model: SINGLE_RESULT_MODEL, editorMode: mode, floorPercent: 0, capPercent: 100, ...(usesBands ? { bandMode: "INTERVALS", bands } : {}) },
    scoringRuleConfigVersion: 1, negativeResultPolicy: negative ? "ALLOW" : "DISALLOW", scoringApprovalStatus: ready ? "APPROVED" : "BLOCKED",
  };
  const update = (i: number, key: keyof BandDraft, value: string) => setRows(rows.map((r, index) => index === i ? {...r, [key]: value} : r));
  const panel = <section className="config-card" aria-label="Evaluation">
    <h3>Evaluation</h3><p>Ingresa un único resultado final por período. Monitoring calcula Compliance %; el excedente se muestra como Extra Points y no aumenta el peso del Scorecard.</p>
    <div className="config-fields-grid">
      <label className="evaluation-type-field"><span>Evaluation Type</span><select value={behavior} onChange={e => {setBehavior(e.target.value); if (e.target.value === "ZERO_IS_BETTER") onZeroTarget?.();}}>
        <option value="HIGHER_IS_BETTER">Más es mejor</option><option value="LOWER_IS_BETTER">Menos es mejor</option><option value="ZERO_IS_BETTER">Lo ideal es cero</option>
      </select></label>
      <fieldset className="negative-values-field"><legend>Negative values allowed?</legend><div className="negative-values-options"><label><input type="radio" name="negative-values" checked={!negative} onChange={() => setNegative(false)}/>No</label><label><input type="radio" name="negative-values" checked={negative} onChange={() => setNegative(true)}/>Yes</label></div></fieldset>
    </div>
    <section className={`result-bands-editor simple-result-bands restored-result-bands ${mode === "INTERVALS" ? "interval-result-bands" : ""}`} aria-label="Bandas de resultado">
    <h3>Bandas de resultado</h3><label className="band-mode-field"><span>Tipo de bandas</span><select value={mode} onChange={e => {setMode(e.target.value); if (!rows.length && e.target.value !== "NONE") setRows([{from: "", to: String(input?.goal ?? 0), compliance: behavior === "HIGHER_IS_BETTER" ? "0" : "100"}, {from: String(input?.goal ?? 0), to: "", compliance: behavior === "HIGHER_IS_BETTER" ? "100" : "0"}]);}}>
      <option value="NONE">Sin bandas</option><option value="INTERVALS">Intervalos de resultado</option><option value="LEVELS">Niveles de cumplimiento</option>
    </select></label>
    {!usesBands ? <p>Compliance = {behavior === "LOWER_IS_BETTER" ? "Goal / Result" : "Result / Goal"} × 100, limitado a 0–100%.{input?.measurementUnit === "%" && " El resultado en % y Compliance % representan conceptos distintos."}</p> : <>
      <p>{mode === "LEVELS" ? "Escribe el límite de cada nivel. En el último puedes usar 10+ para indicar 10 en adelante; ese valor pertenece al último nivel." : "Hasta incluye el límite. Cada intervalo siguiente excluye su límite inferior. Un límite vacío significa sin límite."}</p>
      <div className="bands-layout">
        <div className="bands-table-panel">
          <button type="button" className="add-bands-button" onClick={() => setRows([...rows, {from: rows[rows.length - 1]?.to ?? "", to: "", compliance: "0"}])}>+ Agregar banda</button>
          <div className="bands-table">
            <div className="bands-table-heading">{mode !== "LEVELS" && <span>Desde</span>}<span>{mode === "LEVELS" ? "Resultado hasta" : "Hasta"}</span><span>Cumplimiento %</span><span/></div>
            {rows.map((row, i) => <div className="result-band-row" key={i}>
              {mode !== "LEVELS" && <label><span>Desde</span><input aria-label={`From ${i + 1}`} type="number" step="any" placeholder="Sin límite inferior..." value={row.from} onChange={e => update(i, "from", e.target.value)}/></label>}
              <label><span>Hasta</span><input aria-label={`To ${i + 1}`} type={mode === "LEVELS" ? "text" : "number"} step="any" placeholder={mode === "LEVELS" ? "Ej. 10 o 10+..." : "Sin límite superior..."} value={row.to} onChange={e => update(i, "to", e.target.value)}/></label>
              <label><span>Cumplimiento %</span><input aria-label={`Compliance ${i + 1}`} type="number" min="0" max="100" step="any" placeholder="Ej. 80..." value={row.compliance} onChange={e => update(i, "compliance", e.target.value)}/></label>
              <button type="button" className="delete-band-button" aria-label={`Eliminar banda ${i + 1}`} onClick={() => setRows(rows.filter((_, index) => index !== i))}><Trash2 size={16}/></button>
            </div>)}
          </div>
        </div>
        <div className="bands-preview-panel">
          <ResultBandsPreview compact complianceLevels={mode === "LEVELS"} bands={bands} unit={input?.measurementUnit} ranges={r} complete={validResultBands(bands) && !intervalCoverageError(bands, negative)}/>
        </div>
      </div>
    </>}
    </section>
    {reasons.length > 0 && <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
  </section>;
  return {fields, ready, panel};
}

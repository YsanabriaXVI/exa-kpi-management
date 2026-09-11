import { useEffect, useId, useState } from "react";
import { Trash2 } from "lucide-react";
import type { KpiConfigInput, KpiConfigRecord } from "./kpi-config.types";
import { ResultBandsPreview } from "./ResultBandsPreview";
import { validResultBands } from "./result-bands";
import { buildResultIntervals, buildResultPoints, pointValuesError, pointSuggestions, onwardValue, intervalCoverageError, SINGLE_RESULT_MODEL, type BandDraft } from "./single-result-model";

export function useSingleResultProfile(input: KpiConfigInput | null, saved?: KpiConfigRecord, onZeroTarget?: () => void, showErrors = false) {
  const suggestionId = useId();
  const [behavior, setBehavior] = useState("");
  const [negative, setNegative] = useState<boolean | null>(null);
  const [mode, setMode] = useState("NONE");
  const [rows, setRows] = useState<BandDraft[]>([]);
  useEffect(() => {
    setBehavior(saved?.evaluationTypeCode === "GREATER_IS_BETTER" ? "HIGHER_IS_BETTER" : saved?.evaluationTypeCode ?? "");
    setNegative(saved?.negativeResultPolicy ? saved.negativeResultPolicy === "ALLOW" : null);
    const rule = saved?.scoringRuleConfig;
    const points = rule?.bandMode === "EXACT_POINTS";
    const supported = points || !rule?.bandMode || rule.bandMode === "INTERVALS";
    // Existing LEVELS configurations remain intervals, preserving their meaning.
    setMode(supported && rule?.bands?.length ? points ? "POINTS" : "INTERVALS" : "NONE");
    setRows((supported ? rule?.bands ?? [] : []).map(b => ({ from: b.minResult == null ? "" : String(b.minResult), includesMin: b.includesMin, includesMax: b.includesMax,
      to: points ? b.minResult == null ? `${b.maxResult} o menos` : b.maxResult == null ? String(b.minResult) + "+" : String(b.minResult) : b.maxResult == null ? "" : String(b.maxResult), compliance: String(b.compliance) })));
  }, [saved, input?.definitionId]);
  const bands = mode === "POINTS" ? buildResultPoints(rows) : buildResultIntervals(rows);
  const bandError = mode === "POINTS" ? pointValuesError(rows, negative === true) : intervalCoverageError(bands, negative === true);
  const allowsBands = behavior !== "HIGHER_IS_BETTER" || negative === true;
  const usesBands = allowsBands && mode !== "NONE";
  const reasons: string[] = [];
  if (!["HIGHER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(behavior)) reasons.push("Selecciona qué resultado es mejor para esta nueva revisión.");
  if (!input || !Number.isFinite(input.goal)) reasons.push("Ingresa la meta.");
  if (!input?.measurementUnit) reasons.push("Selecciona Goal Measurement Unit.");
  if (negative === null) reasons.push("Selecciona si se permiten resultados negativos.");
  if (!input?.inputFrequencyCode) reasons.push("Selecciona Input Frequency.");
  if (!input?.dataSource) reasons.push("Selecciona la fuente de datos.");
  if (!usesBands && negative && behavior === "LOWER_IS_BETTER") reasons.push("Usa bandas si Menos es mejor permite resultados negativos; la división proporcional no define ese caso.");
  if (!usesBands && (input?.goal == null || input.goal <= 0 || behavior === "ZERO_IS_BETTER")) reasons.push("Una meta de cero o negativa requiere bandas de resultado.");
  if (behavior === "ZERO_IS_BETTER" && input?.goal !== 0) reasons.push("Lo ideal es cero requiere Goal = 0.");
  const bandReasonsStart = reasons.length;
  if (usesBands) {
    if (!validResultBands(bands)) reasons.push("Completa los límites y el cumplimiento (0–100%) sin superponer intervalos.");
    const coverage = bandError;
    if (coverage) reasons.push(coverage);
    if (validResultBands(bands)) {
      const higher = ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(behavior);
      if (behavior !== "ZERO_IS_BETTER" && bands.some((b, i) => i > 0 && (higher ? b.compliance < bands[i - 1].compliance : b.compliance > bands[i - 1].compliance))) reasons.push("El cumplimiento debe respetar qué resultado es mejor.");
      if (behavior === "ZERO_IS_BETTER" && !bands.some(b => (b.minResult == null || b.minResult < 0 || b.minResult === 0 && b.includesMin) && (b.maxResult == null || b.maxResult >= 0) && b.compliance === 100)) reasons.push("El resultado cero debe recibir 100% de cumplimiento.");
    }
  }
  const bandsInvalid = behavior === "ZERO_IS_BETTER" && !usesBands || reasons.length > bandReasonsStart;
  const goalInvalid = !input || !Number.isFinite(input.goal) || behavior === "ZERO_IS_BETTER" && input.goal !== 0 || !usesBands && behavior !== "ZERO_IS_BETTER" && input.goal <= 0;
  const r = input?.ranges;
  if (!r || r.redFrom !== 0 || r.greenTo !== 100 || r.yellowFrom !== r.redTo + 1 || r.greenFrom !== r.yellowTo + 1 || r.redTo < 0 || r.yellowTo < r.yellowFrom || r.greenFrom > 100) reasons.push("Completa el semáforo de 0 a 100%.");
  const ready = reasons.length === 0;
  const fields = {
    evaluationTypeCode: behavior, resultSemantics: "ABSOLUTE_VALUE", comparisonDirection: null,
    targetKind: "ABSOLUTE_TARGET" as const, scoringMethod: usesBands ? "RESULT_BANDS" : "PROPORTIONAL",
    scoringRuleConfig: { model: SINGLE_RESULT_MODEL, editorMode: usesBands ? mode : "NONE", floorPercent: 0, capPercent: 100, ...(usesBands ? { bandMode: mode === "POINTS" ? "EXACT_POINTS" : "INTERVALS", bands } : {}) },
    scoringRuleConfigVersion: 1, negativeResultPolicy: negative ? "ALLOW" : "DISALLOW", scoringApprovalStatus: ready ? "APPROVED" : "BLOCKED",
  };
  const update = (i: number, key: keyof BandDraft, value: string) => setRows(rows.map((r, index) => index === i ? {...r, [key]: value} : r));
  const panel = <section className="config-card" aria-label="Evaluation">
    <h3>Evaluation</h3><p>Ingresa un único resultado final por período. Monitoring calcula Compliance %; el excedente se muestra como Extra Points y no aumenta el peso del Scorecard.</p>
    <div className="config-fields-grid evaluation-settings-row">
      <label><span>Result Measurement Unit</span><input aria-label="Result Measurement Unit" readOnly value={input?.measurementUnit ?? ""} placeholder="Select a Measurement Unit..."/></label>
      <label className="evaluation-type-field"><span>Evaluation Type *</span><select required className={!behavior ? "goal-field-placeholder" : undefined} data-config-invalid={!behavior} aria-invalid={showErrors && !behavior} value={behavior} onChange={e => {setBehavior(e.target.value); if (e.target.value === "ZERO_IS_BETTER") onZeroTarget?.();}}>
        <option value="">Select an Evaluation Type...</option><option value="HIGHER_IS_BETTER">Más es mejor</option><option value="LOWER_IS_BETTER">Menos es mejor</option><option value="ZERO_IS_BETTER">Lo ideal es cero</option>
      </select></label>
      <fieldset className="negative-values-field" tabIndex={-1} data-config-invalid={negative === null} aria-invalid={showErrors && negative === null}><legend>Negative values allowed?</legend><div className="negative-values-options"><label><input type="radio" name="negative-values" checked={negative === false} onChange={() => setNegative(false)}/>No</label><label><input type="radio" name="negative-values" checked={negative === true} onChange={() => setNegative(true)}/>Yes</label></div></fieldset>
    </div>
    <details className="result-meaning-help">
      <summary>Cómo elegir la regla y el signo del resultado</summary>
      <p>El signo depende del dato que ingresas, no de que el nombre del KPI diga “reducir”. Prefiere resultados positivos cuando representen una cantidad o una reducción lograda.</p>
      <div className="result-meaning-table-scroll">
        <table className="result-meaning-table">
          <thead><tr><th scope="col">Caso y regla</th><th scope="col">Ejemplo 1</th><th scope="col">Ejemplo 2</th></tr></thead>
          <tbody>
            <tr><th scope="row"><strong>Reducción lograda</strong><p>Ingresa cuánto lograste reducir, como un valor positivo. Usa <strong>Más es mejor · Negativos: No</strong>.</p></th><td><strong>Ejemplo 1 — Costos:</strong> meta 5%, resultado 8%. Querías reducir costos 5% y lograste reducirlos 8%; superaste la meta.</td><td><strong>Ejemplo 2 — Consumo de combustible:</strong> meta 10%, resultado 6%. Lograste una reducción de 6%; todavía no alcanzas la meta de 10%.</td></tr>
            <tr><th scope="row"><strong>Valor actual que quieres bajar</strong><p>Ingresa el valor actual, no cuánto cambió. Usa <strong>Menos es mejor · Negativos: No</strong>.</p></th><td><strong>Ejemplo 1 — Desuso de equipos:</strong> meta 5%, resultado 7%. Actualmente 7% de los equipos están en desuso; 3% sería mejor que la meta y 7% es peor.</td><td><strong>Ejemplo 2 — Tiempo de facturación:</strong> meta 2 días, resultado 3 días. Facturar toma 3 días; 1 día sería mejor que la meta. No ingreses −3.</td></tr>
            <tr><th scope="row"><strong>Variación con signo</strong><p>El signo indica si el valor subió o bajó. Usa <strong>Negativos: Yes</strong> y prefiere <strong>bandas</strong> para definir el cumplimiento según qué cambio sea mejor.</p></th><td><strong>Ejemplo 1 — Variación de costos:</strong> −8% significa que bajaron 8%, 0% que no cambiaron y +6% que subieron 6%. Si buscas reducirlos, los valores menores son mejores.</td><td><strong>Ejemplo 2 — Variación de ventas:</strong> −4% significa que cayeron 4% y +12% que crecieron 12%. Si buscas crecimiento, los valores mayores son mejores; asigna su cumplimiento mediante bandas.</td></tr>
            <tr><th scope="row"><strong>Desviación alrededor de cero</strong><p>Lo ideal es no tener diferencia; puede haber desviaciones en ambos sentidos. Usa <strong>Lo ideal es cero · Negativos: Yes · Bandas</strong>.</p></th><td><strong>Ejemplo 1 — Diferencia de inventario:</strong> meta 0%, resultado −2% indica faltante y +2% indica sobrante. Ambos se alejan de cero; define su cumplimiento en las bandas.</td><td><strong>Ejemplo 2 — Error de pronóstico:</strong> meta 0 unidades, resultado −10 indica 10 unidades por debajo de lo previsto y +10 indica 10 por encima. Cero significa que el resultado coincidió con el pronóstico.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Una meta negativa requiere bandas: dividir −5 entre −10 da 50%, aunque −10 pueda ser mejor. El semáforo siempre evalúa Compliance %, no el signo del resultado.</p>
    </details>
    {negative === true && <p role="status">Permite negativos solo cuando el signo tenga significado propio, como variaciones, desviaciones o márgenes. Se recomienda usar bandas para estos resultados.</p>}
    {allowsBands && <section className={`result-bands-editor simple-result-bands restored-result-bands ${mode === "INTERVALS" ? "interval-result-bands" : ""}`} aria-label="Bandas de resultado" tabIndex={-1} data-config-invalid={bandsInvalid} aria-invalid={showErrors && bandsInvalid}>
    <h3>Bandas de resultado</h3><label className="band-mode-field"><span>Tipo de bandas</span><select data-config-invalid={bandsInvalid} aria-invalid={showErrors && bandsInvalid} value={mode} onChange={e => {setMode(e.target.value); if (e.target.value !== mode && e.target.value !== "NONE") setRows(e.target.value === "POINTS" ? [{from:"",to:"0",compliance:behavior === "HIGHER_IS_BETTER" ? "0" : "100"},{from:"",to:"1",compliance:"65"},{from:"",to:"2+",compliance:behavior === "HIGHER_IS_BETTER" ? "100" : "0"}] : [{from:"",to:String(input?.goal ?? 0),compliance:behavior === "HIGHER_IS_BETTER" ? "0" : "100"},{from:String(input?.goal ?? 0),to:"",compliance:behavior === "HIGHER_IS_BETTER" ? "100" : "0"}]);}}>
      <option value="NONE">Sin bandas</option><option value="INTERVALS">Intervalos de resultado</option><option value="POINTS">Valores puntuales</option>
    </select></label>
    <p>{behavior === "ZERO_IS_BETTER" ? "Bandas obligatorias: define el cumplimiento para la meta cero." : "Bandas opcionales. Sin bandas se calcula el cumplimiento proporcional con una meta mayor que cero."}</p>
    {!usesBands ? <p>Compliance = {behavior === "LOWER_IS_BETTER" ? "Goal / Result" : "Result / Goal"} × 100, limitado a 0–100%.{input?.measurementUnit === "%" && " El resultado en % y Compliance % representan conceptos distintos."}</p> : <>
      <p>{mode === "POINTS" ? "Escribe un número y elige una sugerencia: N o menos (or lower) significa resultado ≤ N y solo va en la primera fila; N+ significa resultado ≥ N y solo va en la última. Las demás filas son valores exactos. Para resultados continuos, utiliza intervalos. Los valores no definidos quedan sin cálculo." : "Hasta incluye el límite. Cada intervalo siguiente excluye su límite inferior. Un límite vacío significa sin límite."}</p>
      <div className="bands-layout">
        <div className="bands-table-panel">
          <button type="button" className="add-bands-button" disabled={mode === "POINTS" && rows.some(row => onwardValue(row.to) !== null)} onClick={() => setRows([...rows, {from: rows[rows.length - 1]?.to ?? "", to: "", compliance: "0"}])}>+ Agregar banda</button>
          <div className="bands-table">
            <div className="bands-table-heading">{mode !== "POINTS" && <span>Desde</span>}<span>{mode === "POINTS" ? "Resultado" : "Hasta"}</span><span>Cumplimiento %</span><span/></div>
            {rows.map((row, i) => <div className="result-band-row" key={i}>
              {mode !== "POINTS" && <label><span>Desde</span><input aria-label={`From ${i + 1}`} type="number" step="any" placeholder="Sin límite inferior..." value={row.from} onChange={e => update(i, "from", e.target.value)}/></label>}
              <label><span>{mode === "POINTS" ? "Resultado" : "Hasta"}</span><input aria-label={`${mode === "POINTS" ? "Result" : "To"} ${i + 1}`} type={mode === "POINTS" ? "text" : "number"} list={mode === "POINTS" ? `${suggestionId}-${i}` : undefined} autoComplete="off" step="any" placeholder={mode === "POINTS" ? "Ej. 0 o menos, 1, 2+" : "Sin límite superior..."} value={row.to} onChange={e => update(i, "to", e.target.value)}/>{mode === "POINTS" && <datalist id={`${suggestionId}-${i}`}>{pointSuggestions(row.to, i === 0, i === rows.length - 1).map(value => <option key={value} value={value}/>)}</datalist>}</label>
              <label><span>Cumplimiento %</span><input aria-label={`Compliance ${i + 1}`} type="number" min="0" max="100" step="any" placeholder="Ej. 80..." value={row.compliance} onChange={e => update(i, "compliance", e.target.value)}/></label>
              <button type="button" className="delete-band-button" aria-label={`Eliminar banda ${i + 1}`} onClick={() => setRows(rows.filter((_, index) => index !== i))}><Trash2 size={16}/></button>
            </div>)}
          </div>
        </div>
        <div className="bands-preview-panel">
          <ResultBandsPreview compact exactPoints={mode === "POINTS"} bands={bands} unit={input?.measurementUnit} ranges={r} complete={validResultBands(bands) && !bandError}/>
        </div>
      </div>
    </>}
    </section>}
    {reasons.length > 0 && <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
  </section>;
  return {fields, ready, reasons, goalInvalid, panel};
}

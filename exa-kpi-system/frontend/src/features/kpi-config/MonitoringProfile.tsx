import { ActionToast } from "../../components/ActionToast";
import { ChevronDown, Trash2 } from "lucide-react";
import { bandStartSchema, resultBandsSchema, validResultBands } from "./result-bands";
import { ResultBandsPreview } from "./ResultBandsPreview";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { KpiConfigInput, KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import { ExplainedSelect } from "./ExplainedSelect";
import { behaviorOptions, semanticsOptions, directionOptions, negativeOptions } from "./monitoring-profile-options";

export function useMonitoringProfile(input: KpiConfigInput | null, saved?: KpiConfigRecord, resultSetup?: { onSemanticsChange: (value: string) => void; onZeroTarget?: () => void; evaluationScope?: KpiConfigInput["evaluationScope"]; ranges?: TrafficLightRanges; editor: ReactNode }) {
  const behaviorField = useRef<HTMLDivElement>(null);
  const [bandsToast, setBandsToast] = useState<{ message: string; id: number } | null>(null);
  const [behavior, setBehavior] = useState("");
  const [semantics, setSemantics] = useState("");
  const [direction, setDirection] = useState("");
  const [floor, setFloor] = useState("0");
  const [cap, setCap] = useState("100");
  const [negative, setNegative] = useState("DISALLOW");
  const [bands, setBands] = useState<Array<{ minResult: string; maxResult: string; compliance: string; includesMin: boolean; includesMax: boolean }>>([]);
  const [confirmed, setConfirmed] = useState("");
  useEffect(() => {
    setBehavior(saved?.evaluationTypeCode ?? ""); setSemantics(saved?.resultSemantics ?? "");
    setDirection(saved?.comparisonDirection ?? "");
    setFloor(String(saved?.scoringRuleConfig?.floorPercent ?? 0)); setCap(String(saved?.scoringRuleConfig?.capPercent ?? 100));
    setNegative(saved?.negativeResultPolicy ?? "DISALLOW");
    setBands((saved?.scoringRuleConfig?.bands ?? []).map((band: any) => ({ minResult: String(band.minResult) + (band.maxResult == null ? "+" : ""), maxResult: band.maxResult == null ? "" : String(band.maxResult), compliance: String(band.compliance), includesMin: band.includesMin !== false, includesMax: band.includesMax !== false })));
    setConfirmed("");
  }, [saved, input?.definitionId]);
  const selectedBehavior = behavior || input?.evaluationTypeCode || "";
  const selectedSemantics = semantics || input?.resultSemantics || "";
  const historical = input?.periodScope !== "CURRENT_PERIOD";
  const comparisonDirection = historical ? direction || input?.comparisonDirection || (selectedBehavior === "LOWER_IS_BETTER" ? "REDUCTION" : ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(selectedBehavior) ? "INCREASE" : "") : null;
  const goals = input?.evaluationScope === "BY_SUBJECT" ? input.subjectGoals?.map(row => row.goal) ?? [] : [input?.goal];
  const zero = !historical && goals.length > 0 && goals.every(goal => goal === 0);
  const bandsAllowed = (resultSetup?.evaluationScope ?? input?.evaluationScope) === "OVERALL";
  const method = selectedSemantics === "BINARY" ? "BINARY" : bandsAllowed && bands.length ? "RESULT_BANDS" : "PROPORTIONAL";
  const usesBands = method === "RESULT_BANDS";
  const proportional = method === "PROPORTIONAL";
  const higher = historical || ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(selectedBehavior);
  const commonGoal = goals.length && goals.every(goal => goal === goals[0]) ? goals[0] : undefined;
  const countBands = selectedSemantics === "COUNT" && !historical;
  const sorted = bands.map(band => { const start = bandStartSchema.safeParse(band.minResult); return { minResult: start.success ? start.data.minResult : NaN, onward: start.success && start.data.onward, compliance: band.compliance.trim() ? Number(band.compliance) : NaN }; }).sort((a, b) => a.minResult - b.minResult);
  const parsedBands = sorted.map((band, index) => ({ ...band,
    ...(!band.onward && sorted[index + 1] ? { maxResult: sorted[index + 1].minResult } : {}),
    includesMin: true, includesMax: false,
  }));
  const explainBands = () => {
    const selected = ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(selectedBehavior);
    const message = !selected
      ? "Primero selecciona ¿Qué resultado es mejor? para definir la dirección de las bandas."
      : selectedBehavior === "ZERO_IS_BETTER"
        ? "Lo ideal es cero: 0 = 100%. Al alejarse de cero, baja el cumplimiento."
        : historical
          ? "Las bandas evalúan el porcentaje de mejora: la meta = 100%. Una mejora menor recibe menor cumplimiento."
          : higher
            ? "Más es mejor: Goal o superior = 100%. Al bajar el resultado, baja el cumplimiento."
            : "Menos es mejor: Goal o inferior = 100%. Al subir el resultado, baja el cumplimiento.";
    setBandsToast({ message, id: Date.now() });
    if (!selected) {
      behaviorField.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      behaviorField.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
    return selected;
  };
  const addBands = () => {
    if (!explainBands()) return;
    const target = commonGoal == null ? "" : String(commonGoal);
    setBands([...bands, { minResult: bands.length ? "" : target, maxResult: "", compliance: bands.length ? "" : "100", includesMin: true, includesMax: false }]);
  };
  const bandValidation = resultBandsSchema.safeParse(parsedBands);
  const reasons: string[] = [];
  if (usesBands && countBands && sorted.some(point => !Number.isInteger(point.minResult) || point.minResult < 0)) reasons.push("Los conteos requieren valores enteros no negativos en Desde.");
  if (usesBands && !bandValidation.success) reasons.push(...bandValidation.error.issues.map(issue => "Banda " + (Number(issue.path[0]) + 1) + ": " + (issue.code === "custom" ? issue.message : "Completa valores numéricos finitos y cumplimiento entre 0 y 100%.")));

  if (usesBands && validResultBands(parsedBands) && sorted.some((band, index) => {
    const previous = sorted[index - 1];
    return previous && (higher ? band.compliance < previous.compliance : band.compliance > previous.compliance);
  })) reasons.push(higher
    ? "Al aumentar el resultado evaluado, el cumplimiento no puede bajar."
    : "Al aumentar el resultado, el cumplimiento no puede subir: menos es mejor.");
  if (usesBands && commonGoal == null) reasons.push("Las bandas compartidas requieren la misma meta para todas las entidades.");
  if (!input?.isActive) reasons.push("Activa esta configuración para utilizarla en Monitoring.");
  if (!(proportional ? ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER"] : ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"]).includes(selectedBehavior)) reasons.push("Selecciona un comportamiento compatible con la meta: más es mejor, menos es mejor o lo ideal es cero.");
  if (!selectedSemantics) reasons.push("Selecciona qué representa el resultado que se va a capturar.");
  if (!goals.length || goals.some(goal => goal == null || !Number.isFinite(goal) || (proportional && goal <= 0))) reasons.push("Ingresa una meta positiva para cada evaluación. Si la meta es cero, define los rangos de resultados y su cumplimiento.");
  if (!input?.measurementUnit || (input.evaluationScope === "BY_SUBJECT" && input.subjectGoals?.some(row => !row.goalUnit || !row.resultUnit))) reasons.push("Completa las unidades de la meta y del resultado en Result Definition.");
  if (!input?.dataSource) reasons.push("Selecciona la fuente de datos.");
  if (!input?.inputFrequencyCode) reasons.push("Selecciona la frecuencia de captura.");
  if (input?.evaluationScope === "BY_SUBJECT" && !input.subjectType) reasons.push("Selecciona el tipo de entidad que se evaluará.");
  if (historical && (!comparisonDirection || goals.some(goal => goal === 0))) reasons.push("Confirma si esperas un aumento o una reducción respecto al histórico e ingresa una meta de cambio positiva.");
  if (historical && (input?.evaluationScope === "BY_SUBJECT" ? input.subjectGoals?.some(row => row.goalUnit !== "%" || row.resultUnit === "%") : input?.goalUnit !== "%" || input?.measurementUnit === "%")) reasons.push("Para comparar con el histórico, expresa la meta en % y el resultado en su unidad original; por ejemplo, meta de aumento del 10% y ventas capturadas en USD.");
  const r = resultSetup?.ranges ?? input?.ranges;
  if (!r || Object.values(r).some(value => !Number.isInteger(value) || value < 0 || value > 100) || r.redFrom !== 0 || r.greenTo !== 100 || r.redFrom > r.redTo || r.redTo + 1 !== r.yellowFrom || r.yellowFrom > r.yellowTo || r.yellowTo + 1 !== r.greenFrom || r.greenFrom > r.greenTo) reasons.push("Completa los rangos consecutivos del semáforo entre 0 y 100; por ejemplo: rojo 0–59, amarillo 60–79 y verde 80–100.");
  if (selectedSemantics !== "BINARY" && (!floor.trim() || !cap.trim() || !Number.isFinite(Number(floor)) || !Number.isFinite(Number(cap)) || Number(floor) < 0 || Number(cap) > 100 || Number(floor) > Number(cap))) reasons.push("Los límites de cumplimiento deben estar entre 0 y 100. El mínimo no puede superar al máximo.");
  if (usesBands && (bands.some(b => !b.minResult.trim() || !b.compliance.trim()) || !validResultBands(parsedBands))) reasons.push("Define bandas sin superposiciones, con cumplimiento entre 0 y 100%. Los límites compartidos se resuelven automáticamente.");
  if (method === "BINARY" && (historical || input?.resultMethod !== "DIRECT")) reasons.push("Sí / No requiere un resultado directo del periodo actual.");
  if (input?.resultMethod === "CALCULATED_FROM_INPUTS" && (input.calculationTemplate !== "DIVIDE" || input.measurementInputs.length !== 2 || input.measurementInputs.some(i => !i.name.trim() || !i.unit))) reasons.push("Completa el concepto y la unidad del numerador y del denominador en Result Definition.");
  const fields = { evaluationTypeCode: selectedBehavior, resultSemantics: selectedSemantics, comparisonDirection: comparisonDirection as "INCREASE" | "REDUCTION" | null, targetKind: historical ? "CHANGE_TARGET" as const : input?.targetKind ?? "ABSOLUTE_TARGET" as const, scoringMethod: method, scoringRuleConfig: usesBands ? { bands: parsedBands, bandMode: countBands ? "STEP_POINTS" as const : "LINEAR_POINTS" as const, floorPercent: Number(floor), capPercent: Number(cap) } : proportional ? { floorPercent: Number(floor), capPercent: Number(cap) } : {}, scoringRuleConfigVersion: 1, negativeResultPolicy: negative };
  const signature = JSON.stringify({ input, fields });
  const ready = reasons.length === 0 && confirmed === signature;
  const panel = <section className="config-card" aria-label="Preparación para Monitoring"><h2>{reasons.length ? "BLOQUEADO" : ready ? "LISTO PARA MONITORING" : "REQUIERE CONFIRMACIÓN"}</h2>
    {bandsToast && <ActionToast key={bandsToast.id} message={bandsToast.message} tone="info" duration={7000}/>}
    <p>Confirma cómo se evaluará el resultado definido arriba. Monitoring aplicará estas reglas al calcular el score.</p>
    <div className="monitoring-profile-select-row">
    <div ref={behaviorField}><ExplainedSelect label="¿Qué resultado es mejor?" value={selectedBehavior === "GREATER_IS_BETTER" ? "HIGHER_IS_BETTER" : selectedBehavior} onChange={setBehavior} options={behaviorOptions} placeholder="Selecciona el comportamiento"/></div>
    <ExplainedSelect label="¿Qué representa el resultado?" value={selectedSemantics} onChange={value => { setSemantics(value); resultSetup?.onSemanticsChange(value); }} options={semanticsOptions} placeholder="Selecciona el significado"/>
    </div>
    {selectedSemantics === "RATIO" && resultSetup?.editor}
    <div className={historical ? "monitoring-profile-select-row" : undefined}>
    {(historical || selectedBehavior === "ZERO_IS_BETTER") && <ExplainedSelect label="Cambio esperado" value={selectedBehavior === "ZERO_IS_BETTER" ? "CLOSER_TO_ZERO" : selectedBehavior === "LOWER_IS_BETTER" && comparisonDirection === "REDUCTION" ? "LOWER_WITH_REDUCTION" : comparisonDirection ?? ""} onChange={value => { if (value === "CLOSER_TO_ZERO") { setBehavior("ZERO_IS_BETTER"); setDirection(""); setNegative("DISALLOW"); resultSetup?.onZeroTarget?.(); return; } setDirection(value === "LOWER_WITH_REDUCTION" ? "REDUCTION" : value); if (value === "LOWER_WITH_REDUCTION") setBehavior("LOWER_IS_BETTER"); }} options={directionOptions.filter(option => historical || option.value === "CLOSER_TO_ZERO")} placeholder="Selecciona la dirección"/>}
    <ExplainedSelect label="Resultados negativos" value={negative} onChange={setNegative} options={negativeOptions} placeholder="Selecciona una opción"/>
    </div>
    <div className="scoring-method-setup">
      {selectedSemantics !== "BINARY" && <>
        <div className="monitoring-profile-select-row">
          <label>Cumplimiento mínimo % <input type="number" min="0" max="100" value={floor} readOnly/></label>
          <label>Cumplimiento máximo % <input type="number" min="0" max="100" value={cap} readOnly/></label>
        </div>
        <p className="bands-calculation-note">Si no defines bandas, el score se calcula proporcionalmente entre estos límites.</p>
        {bandsAllowed && <details className="result-bands-editor simple-result-bands collapsible-bands">
          <summary className="bands-collapse-toggle" onClick={event => { if (!(event.currentTarget.parentElement as HTMLDetailsElement).open && !explainBands()) event.preventDefault(); }}><span>Bandas de resultado {usesBands ? `(${bands.length})` : "(opcional)"}</span><ChevronDown size={18} aria-hidden="true"/></summary>
          <p>{usesBands ? "Las bandas determinan el cumplimiento y tienen prioridad sobre el cálculo normal." : "Sin bandas se utiliza el cálculo normal de cumplimiento."}</p>
          {(zero || selectedBehavior === "ZERO_IS_BETTER") && !usesBands && <p>Para una meta de cero, agrega bandas para definir el cumplimiento.</p>}
          {usesBands && <p>{countBands ? "Cada conteo toma el cumplimiento del punto anterior hasta el siguiente." : "Entre dos puntos, el cumplimiento se calcula proporcionalmente."}</p>}
          {usesBands && <p className="bands-direction-note">{historical
            ? comparisonDirection === "REDUCTION"
              ? "Estas bandas evalúan el % de reducción: una reducción mayor recibe mayor cumplimiento. No ingreses aquí el costo final."
              : "Estas bandas evalúan el % de aumento: un aumento mayor recibe mayor cumplimiento."
            : higher
              ? "Más es mejor: desde la meta en adelante = 100%. Por debajo de la meta, el cumplimiento disminuye."
              : "Menos es mejor: hasta la meta = 100%. Por encima de la meta, el cumplimiento disminuye."}</p>}
          {usesBands && <p>La meta inicia en 100%. Agrega los puntos de cumplimiento; el semáforo determina sus colores.</p>}
          <p className="bands-format-hint"><span className="bands-format-badge">N+ = N en adelante</span> Agrega + al punto final para mantener ese cumplimiento desde ese valor.</p>
          <div className="bands-layout"><div className="bands-table-panel">
          <button type="button" className="add-bands-button" onClick={addBands}>+ Agregar banda</button>
          <div className="bands-table"><div className="bands-table-heading"><span>Desde</span><span>Cumplimiento</span><span/></div>
          {bands.map((band, index) => <div className="result-band-row" key={index}>
            <label><span>Desde</span><input aria-label={"Desde banda " + (index + 1)} type="text" inputMode="text" placeholder={countBands ? "Ej. 3+" : "Ej. 2.5+"} value={band.minResult} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, minResult: e.target.value} : row))}/></label>
            <label><span>Cumplimiento %</span><input aria-label={"Cumplimiento banda " + (index + 1)} type="number" min="0" max="100" value={band.compliance} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, compliance: e.target.value} : row))}/></label>
            <button type="button" className="delete-band-button" aria-label={"Eliminar banda " + (index + 1)} onClick={() => setBands(bands.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
          </div>)}
          </div></div><div className="bands-preview-panel">
          {usesBands && <>
            <p>Los intervalos se forman automáticamente. Desde el último punto se mantiene su cumplimiento.</p>
            <ResultBandsPreview pointMode={countBands ? "STEP_POINTS" : "LINEAR_POINTS"} bands={parsedBands} ranges={r} complete={bands.every(band => Boolean(band.minResult.trim() && band.compliance.trim()))}/>
          </>}
          {!usesBands && <p>Agrega bandas para ver su cumplimiento y color.</p>}
          </div></div>
        </details>}
      </>}
      {selectedSemantics === "BINARY" && <p>Sí = 100% de cumplimiento. No = 0%.</p>}
    </div>
    {reasons.length > 0 && <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    <label><input type="checkbox" disabled={reasons.length > 0} checked={ready} onChange={e => setConfirmed(e.target.checked ? signature : "")}/>Confirmo estas reglas de evaluación.</label>
  </section>;
  return { fields: { ...fields, scoringApprovalStatus: ready ? "APPROVED" : "BLOCKED" }, ready, panel };
}

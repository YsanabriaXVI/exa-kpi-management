import { additiveResultError } from "./additive-results";
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
  const [bandMode, setBandMode] = useState<"" | "INTERVALS" | "STEP_POINTS" | "LINEAR_POINTS">("");
  const [confirmed, setConfirmed] = useState("");
  useEffect(() => {
    setBehavior(saved?.evaluationTypeCode ?? ""); setSemantics(saved?.resultSemantics ?? "");
    setDirection(saved?.comparisonDirection ?? "");
    setFloor(String(saved?.scoringRuleConfig?.floorPercent ?? 0)); setCap(String(saved?.scoringRuleConfig?.capPercent ?? 100));
    setNegative(saved?.negativeResultPolicy ?? "DISALLOW");
    setBandMode(saved?.scoringRuleConfig?.bands?.length ? saved.scoringRuleConfig.bandMode ?? "INTERVALS" : "");
    setBands((saved?.scoringRuleConfig?.bands ?? []).map((band: any) => ({ minResult: band.minResult == null ? "" : String(band.minResult) + (saved?.scoringRuleConfig?.bandMode && saved.scoringRuleConfig.bandMode !== "INTERVALS" && band.maxResult == null ? "+" : ""), maxResult: band.maxResult == null ? "" : String(band.maxResult), compliance: String(band.compliance), includesMin: band.includesMin !== false, includesMax: band.includesMax !== false })));
    setConfirmed("");
  }, [saved, input?.definitionId]);
  const selectedBehavior = behavior || input?.evaluationTypeCode || "";
  const selectedSemantics = semantics || input?.resultSemantics || "";
  const historical = input?.periodScope !== "CURRENT_PERIOD";
  const comparisonDirection = historical ? direction || input?.comparisonDirection || (["LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(selectedBehavior) ? "REDUCTION" : ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(selectedBehavior) ? "INCREASE" : "") : null;
  const contributing = input?.evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL";
  const goals = input?.evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? input.subjectGoals?.map(row => row.goal) ?? [] : [input?.goal];
  const zero = !historical && goals.length > 0 && goals.every(goal => goal === 0);
  const method = selectedSemantics === "BINARY" ? "BINARY" : bands.length ? "RESULT_BANDS" : "PROPORTIONAL";
  const usesBands = method === "RESULT_BANDS";
  const proportional = method === "PROPORTIONAL";
  const higher = historical || ["HIGHER_IS_BETTER", "GREATER_IS_BETTER"].includes(selectedBehavior);
  const commonGoal = goals.length && goals.every(goal => goal === goals[0]) ? goals[0] : undefined;
  const countBands = selectedSemantics === "COUNT" && !historical;
  const sorted = bands.map(band => { const start = bandStartSchema.safeParse(band.minResult); return { minResult: start.success ? start.data.minResult : NaN, onward: start.success && start.data.onward, compliance: band.compliance.trim() ? Number(band.compliance) : NaN }; }).sort((a, b) => a.minResult - b.minResult);
  const pointBands = sorted.map((band, index) => ({ ...band,
    ...(!band.onward && sorted[index + 1] ? { maxResult: sorted[index + 1].minResult } : {}),
    includesMin: true, includesMax: false,
  }));
  const intervalMode = bandMode === "INTERVALS";
  const parsedBands = intervalMode ? bands.map(band => ({
    minResult: band.minResult.trim() ? Number(band.minResult.replace(",", ".")) : null,
    maxResult: band.maxResult.trim() ? Number(band.maxResult.replace(",", ".")) : null,
    compliance: band.compliance.trim() ? Number(band.compliance) : NaN,
    includesMin: band.includesMin, includesMax: band.includesMax,
  })) : pointBands;
  const explainBands = () => {
    const selected = ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"].includes(selectedBehavior);
    const message = !selected
      ? "Primero selecciona ¿Qué resultado es mejor? para definir la dirección de las bandas."
      : !historical && selectedBehavior === "ZERO_IS_BETTER"
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
    const zeroBehavior = !historical && selectedBehavior === "ZERO_IS_BETTER";
    setBands([...bands, {
      minResult: bands.length || intervalMode && !higher && !zeroBehavior ? "" : target,
      maxResult: !bands.length && intervalMode && !higher ? target : "",
      compliance: bands.length ? "" : "100",
      includesMin: zeroBehavior || higher, includesMax: !higher,
    }]);
  };
  const bandValidation = resultBandsSchema.safeParse(parsedBands);
  const reasons: string[] = [];
  if (usesBands && bandMode === "STEP_POINTS" && parsedBands.some(band => band.minResult == null || !Number.isInteger(band.minResult) || band.minResult < 0)) reasons.push("Los puntos escalonados requieren valores enteros no negativos. Usa intervalos explícitos para negativos o decimales.");
  if (input?.evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" && additiveResultError(selectedSemantics, input.measurementUnit)) reasons.push("SUM requiere conteos o cantidades aditivas en una unidad compatible. No se pueden sumar porcentajes, razones, costos unitarios ni duraciones.");
  if (usesBands && countBands && parsedBands.some(band => [band.minResult, band.maxResult].some(value => value != null && (!Number.isInteger(value) || value < 0)))) reasons.push("Los conteos requieren valores enteros no negativos en Desde.");
  if (usesBands && !bandValidation.success) reasons.push(...bandValidation.error.issues.map(issue => "Banda " + (Number(issue.path[0]) + 1) + ": " + (issue.code === "custom" ? issue.message : "Completa valores numéricos finitos y cumplimiento entre 0 y 100%.")));

  if (usesBands && (historical || selectedBehavior !== "ZERO_IS_BETTER") && validResultBands(parsedBands) && [...parsedBands].sort((a, b) => (a.minResult ?? -Infinity) - (b.minResult ?? -Infinity)).some((band, index, ordered) => {
    const previous = ordered[index - 1];
    return previous && (higher ? band.compliance < previous.compliance : band.compliance > previous.compliance);
  })) reasons.push(higher
    ? "Al aumentar el resultado evaluado, el cumplimiento no puede bajar."
    : "Al aumentar el resultado, el cumplimiento no puede subir: menos es mejor.");
  if (usesBands && commonGoal == null) reasons.push("Las bandas compartidas requieren la misma meta para todas las entidades.");
  if (contributing && !historical && selectedBehavior === "ZERO_IS_BETTER") {
    if (input?.goal !== 0) reasons.push("Lo ideal es cero requiere una meta global de 0.");
    if (usesBands && validResultBands(parsedBands) && !parsedBands.some(band => (band.minResult == null || band.minResult < 0 || band.minResult === 0 && band.includesMin !== false) && (band.maxResult == null || band.maxResult > 0 || band.maxResult === 0 && band.includesMax !== false))) reasons.push("Las bandas globales deben incluir el resultado total 0.");
  }
  if (!input?.isActive) reasons.push("Activa esta configuración para utilizarla en Monitoring.");
  if (!(proportional && !historical ? ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER"] : ["HIGHER_IS_BETTER", "GREATER_IS_BETTER", "LOWER_IS_BETTER", "ZERO_IS_BETTER"]).includes(selectedBehavior)) reasons.push("Selecciona un comportamiento compatible con la meta: más es mejor, menos es mejor o lo ideal es cero.");
  if (!selectedSemantics) reasons.push("Selecciona qué representa el resultado que se va a capturar.");
  if (!goals.length || goals.some(goal => goal == null || !Number.isFinite(goal) || (proportional && goal <= 0))) reasons.push("Ingresa una meta positiva para cada evaluación. Si la meta es cero, define los rangos de resultados y su cumplimiento.");
  if (!input?.measurementUnit || (input.evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" && input.subjectGoals?.some(row => !row.goalUnit || !row.resultUnit))) reasons.push("Completa las unidades de la meta y del resultado en Result Definition.");
  if (!input?.dataSource) reasons.push("Selecciona la fuente de datos.");
  if (!input?.inputFrequencyCode) reasons.push("Selecciona la frecuencia de captura.");
  if (input?.evaluationScope === "BY_SUBJECT" && !input.subjectType) reasons.push("Selecciona el tipo de entidad que se evaluará.");
  if (historical && (!comparisonDirection || goals.some(goal => goal === 0))) reasons.push("Confirma si esperas un aumento o una reducción respecto al histórico e ingresa una meta de cambio positiva.");
  if (historical && (input?.evaluationScope === "BY_SUBJECT" && input.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? input.subjectGoals?.some(row => row.goalUnit !== "%" || row.resultUnit === "%") : input?.goalUnit !== "%" || input?.measurementUnit === "%")) reasons.push("Para comparar con el histórico, expresa la meta en % y el resultado en su unidad original; por ejemplo, meta de aumento del 10% y ventas capturadas en USD.");
  const r = resultSetup?.ranges ?? input?.ranges;
  if (!r || Object.values(r).some(value => !Number.isInteger(value) || value < 0 || value > 100) || r.redFrom !== 0 || r.greenTo !== 100 || r.redFrom > r.redTo || r.redTo + 1 !== r.yellowFrom || r.yellowFrom > r.yellowTo || r.yellowTo + 1 !== r.greenFrom || r.greenFrom > r.greenTo) reasons.push("Completa los rangos consecutivos del semáforo entre 0 y 100; por ejemplo: rojo 0–59, amarillo 60–79 y verde 80–100.");
  if (selectedSemantics !== "BINARY" && (!floor.trim() || !cap.trim() || !Number.isFinite(Number(floor)) || !Number.isFinite(Number(cap)) || Number(floor) < 0 || Number(cap) > 100 || Number(floor) > Number(cap))) reasons.push("Los límites de cumplimiento deben estar entre 0 y 100. El mínimo no puede superar al máximo.");
  if (usesBands && (bands.some(b => (!intervalMode && !b.minResult.trim()) || !b.compliance.trim()) || !validResultBands(parsedBands))) reasons.push("Define bandas sin superposiciones, con cumplimiento entre 0 y 100%. Selecciona qué extremos se incluyen.");
  if (method === "BINARY" && (historical || input?.resultMethod !== "DIRECT")) reasons.push("Sí / No requiere un resultado directo del periodo actual.");
  if (input?.resultMethod === "CALCULATED_FROM_INPUTS" && (input.calculationTemplate !== "DIVIDE" || input.measurementInputs.length !== 2 || input.measurementInputs.some(i => !i.name.trim() || !i.unit))) reasons.push("Completa el concepto y la unidad del numerador y del denominador en Result Definition.");
  const fields = { evaluationTypeCode: selectedBehavior, resultSemantics: selectedSemantics, comparisonDirection: comparisonDirection as "INCREASE" | "REDUCTION" | null, targetKind: historical ? "CHANGE_TARGET" as const : input?.targetKind ?? "ABSOLUTE_TARGET" as const, scoringMethod: method, scoringRuleConfig: usesBands ? { bands: parsedBands, bandMode: bandMode || "INTERVALS" as const, floorPercent: Number(floor), capPercent: Number(cap) } : proportional ? { floorPercent: Number(floor), capPercent: Number(cap) } : {}, scoringRuleConfigVersion: 1, negativeResultPolicy: negative };
  const signature = JSON.stringify({ input, fields });
  const ready = reasons.length === 0 && confirmed === signature;
  const panel = <section className="config-card" aria-label="Preparación para Monitoring"><div className="monitoring-status-heading"><h3>Evaluation Rules</h3><span className={`monitoring-status-badge ${ready ? "ready" : "pending"}`}>{ready ? "Confirmado" : reasons.length ? "Campos pendientes" : "Pendiente de confirmar"}</span></div>
    {bandsToast && <ActionToast key={bandsToast.id} message={bandsToast.message} tone="info" duration={7000}/>}
    <p>Confirma cómo se evaluará el resultado definido arriba. Monitoring aplicará estas reglas al calcular el score.</p>
    <div className="monitoring-profile-select-row">
    <div ref={behaviorField}><ExplainedSelect label="¿Qué resultado es mejor?" value={selectedBehavior === "GREATER_IS_BETTER" ? "HIGHER_IS_BETTER" : selectedBehavior} onChange={value => { setBehavior(value); if (contributing && !historical && value === "ZERO_IS_BETTER") resultSetup?.onZeroTarget?.(); }} options={behaviorOptions} placeholder="Selecciona el comportamiento"/></div>
    <ExplainedSelect label="¿Qué representa el resultado?" value={selectedSemantics} onChange={value => { setSemantics(value); resultSetup?.onSemanticsChange(value); }} options={semanticsOptions} placeholder="Selecciona el significado"/>
    </div>
    {contributing && !historical && <aside className="global-contribution-rule" aria-label="Evaluacion global por contribuciones">
      <strong>Una sola evaluacion global</strong>
      <p>{input?.subjects?.length ?? 0} entidades aportan resultados en {input?.measurementUnit || "la unidad seleccionada"}. Primero se suman y despues se evalua el total contra la meta global.</p>
      {historical ? <p>Se compara el total actual con el total historico. El cambio obtenido se evalua una sola vez.</p> : selectedBehavior === "LOWER_IS_BETTER" ? <>
        <p>{usesBands ? "Las bandas se aplican al total: cuanto menor sea la suma, mejor." : "Cumplimiento = meta global / suma de resultados x 100, limitado al maximo configurado. Un total de 0 recibe el cumplimiento maximo."}</p>
        <small>Ejemplo: meta global 100; A aporta 40 y B aporta 80. Total 120: cumplimiento proporcional 83.33%.</small>
      </> : selectedBehavior === "ZERO_IS_BETTER" ? <>
        <p>Meta global: 0. Las bandas asignan el cumplimiento a la suma de resultados.</p>
        <small>Ejemplo ilustrativo: A registra 1 incidente y B registra 2; total 3. Bandas: 0 = 100%, 1 a 2 = 70%, 3 o mas = 0%. Define y confirma tus propias bandas.</small>
      </> : <p>La suma se compara con una sola meta global; se calcula un unico cumplimiento y semaforo.</p>}
    </aside>}
    {historical && <aside className="global-contribution-rule" aria-label="Evaluacion historica">
      <strong>{input?.periodScope === "PREVIOUS_PERIOD" ? "Previous Period" : "Same Period Last Year"} / {contributing ? "Una evaluacion global" : input?.evaluationScope === "BY_SUBJECT" ? "Una evaluacion por entidad" : "Overall"}</strong>
      <p>{input?.periodScope === "PREVIOUS_PERIOD" ? "Referencia: el periodo inmediatamente anterior, segun la frecuencia de captura." : "Referencia: el mismo periodo del ano anterior, segun la frecuencia de captura."}</p>
      <p>{contributing ? "Se suman los resultados actuales de las entidades y se comparan con el total historico. Se calcula un solo cambio, cumplimiento y semaforo." : input?.evaluationScope === "BY_SUBJECT" ? "Cada entidad compara su resultado actual con su propia referencia historica y su propia meta de cambio. No se suman los resultados ni se exige una meta grupal." : "El resultado global actual se compara con su referencia historica. Se calcula un solo cambio, cumplimiento y semaforo."}</p>
      <p>{comparisonDirection === "REDUCTION" ? "Reduccion (%) = (referencia - actual) / referencia x 100." : "Aumento (%) = (actual - referencia) / referencia x 100."} {usesBands ? "Las bandas se aplican al cambio obtenido (%)." : "Cumplimiento = cambio obtenido / meta de cambio x 100, dentro de los limites configurados."}</p>
      <small>{comparisonDirection === "REDUCTION" ? "Ejemplo: referencia 100, actual 80, meta de reduccion 25%. Reduccion obtenida: 20%; cumplimiento proporcional: 80%." : "Ejemplo: referencia 100, actual 120, meta de aumento 25%. Aumento obtenido: 20%; cumplimiento proporcional: 80%."}</small>
      {selectedBehavior === "ZERO_IS_BETTER" && <p>Con referencia historica se evalua una reduccion porcentual con meta positiva. Para exigir un resultado final igual a 0, usa Current Period y bandas de resultado.</p>}
      <small>La referencia debe estar disponible y ser valida antes de calcular el cambio.</small>
    </aside>}
    {selectedSemantics === "RATIO" && resultSetup?.editor}
    <div className="monitoring-profile-select-row expected-change-row">
    <div><ExplainedSelect label="Cambio esperado" value={!historical ? selectedBehavior === "ZERO_IS_BETTER" ? "CLOSER_TO_ZERO" : "CURRENT_TARGET" : selectedBehavior === "LOWER_IS_BETTER" && comparisonDirection === "REDUCTION" ? "LOWER_WITH_REDUCTION" : comparisonDirection ?? ""} onChange={value => { if (value === "CURRENT_TARGET") return; if (value === "CLOSER_TO_ZERO") { setBehavior("ZERO_IS_BETTER"); setDirection(""); resultSetup?.onZeroTarget?.(); return; } setDirection(value === "LOWER_WITH_REDUCTION" ? "REDUCTION" : value); if (value === "LOWER_WITH_REDUCTION") setBehavior("LOWER_IS_BETTER"); }} options={!historical && selectedBehavior !== "ZERO_IS_BETTER" ? [{ value: "CURRENT_TARGET", label: "No aplica: meta del periodo actual", meaning: "El resultado se compara directamente con la meta del periodo actual.", example: "Meta: 100 unidades. Resultado: 90 unidades. No se calcula un cambio respecto a otro periodo." }] : directionOptions.filter(option => historical ? option.value !== "CLOSER_TO_ZERO" : option.value === "CLOSER_TO_ZERO")} placeholder="Selecciona la dirección"/>
    <p className="expected-change-suggestion">{historical ? "Sugerencia: usa Aumento para crecer o Reduccion para disminuir respecto al periodo de referencia." : "Sugerencia: en Current Period compara directamente el resultado con su meta."}</p></div>
    <ExplainedSelect label="Resultados negativos" value={negative} onChange={setNegative} options={negativeOptions} placeholder="Selecciona una opción"/>
    </div>
    <div className="scoring-method-setup">
      {selectedSemantics !== "BINARY" && <>
        <div className="monitoring-profile-select-row">
          <label>Cumplimiento mínimo % <input type="number" min="0" max="100" value={floor} readOnly/></label>
          <label>Cumplimiento máximo % <input type="number" min="0" max="100" value={cap} readOnly/></label>
        </div>
        <p className="bands-calculation-note">Si no defines bandas, el score se calcula proporcionalmente entre estos límites.</p>
        <details className={`result-bands-editor simple-result-bands collapsible-bands ${intervalMode ? "interval-result-bands" : ""}`}>
          <summary className="bands-collapse-toggle" onClick={event => { if (!(event.currentTarget.parentElement as HTMLDetailsElement).open && !explainBands()) event.preventDefault(); }}><span>{contributing ? "Bandas del resultado global" : "Bandas de resultado"} {usesBands ? `(${bands.length})` : "(opcional)"}</span><ChevronDown size={18} aria-hidden="true"/></summary>
          <p>{usesBands ? "Las bandas determinan el cumplimiento y tienen prioridad sobre el cálculo normal." : "Sin bandas se utiliza el cálculo normal de cumplimiento."}</p>
          {(zero || !historical && selectedBehavior === "ZERO_IS_BETTER") && !usesBands && <p>Para una meta de cero, agrega bandas para definir el cumplimiento.</p>}
          {usesBands && !intervalMode && <p>{bandMode === "STEP_POINTS" ? "Cada resultado toma el cumplimiento del punto anterior hasta el siguiente." : "Entre dos puntos, el cumplimiento se calcula proporcionalmente."}</p>}
          {usesBands && selectedBehavior !== "ZERO_IS_BETTER" && <p className="bands-direction-note">{historical
            ? comparisonDirection === "REDUCTION"
              ? "Estas bandas evalúan el % de reducción: una reducción mayor recibe mayor cumplimiento. No ingreses aquí el costo final."
              : "Estas bandas evalúan el % de aumento: un aumento mayor recibe mayor cumplimiento."
            : higher
              ? "Más es mejor: desde la meta en adelante = 100%. Por debajo de la meta, el cumplimiento disminuye."
              : "Menos es mejor: hasta la meta = 100%. Por encima de la meta, el cumplimiento disminuye."}</p>}
          {usesBands && !intervalMode && <p>La meta inicia en 100%. Agrega los puntos de cumplimiento; el semáforo determina sus colores.</p>}
          {intervalMode && <p>Define Desde y Hasta; deja un límite vacío para indicar sin límite. Elige si cada extremo se incluye. El cumplimiento es fijo dentro de cada intervalo.</p>}
          {intervalMode && !historical && selectedBehavior === "ZERO_IS_BETTER" && <p>Puedes definir bandas a ambos lados de cero, por ejemplo −1 ≤ x ≤ 1. Asigna cada extremo compartido a una sola banda para evitar superposiciones.</p>}
          <label className="band-mode-field"><span>Tipo de bandas</span><select aria-label="Tipo de bandas" value={bandMode} onChange={e => { setBandMode(e.target.value as typeof bandMode); setBands(e.target.value ? bands.map(band => ({...band, minResult: band.minResult.replace(/\+$/, "")})) : []); }}><option value="">— Sin bandas</option><option value="INTERVALS">Intervalos explícitos</option><option value="STEP_POINTS">Puntos escalonados</option><option value="LINEAR_POINTS">Puntos con interpolación</option></select></label>
          {bandMode && <>
          {!intervalMode && <p className="bands-format-hint"><span className="bands-format-badge">N+ = N en adelante</span> Agrega + al punto final para mantener ese cumplimiento desde ese valor.</p>}
          <div className="bands-layout"><div className="bands-table-panel">
          <button type="button" className="add-bands-button" onClick={addBands}>+ Agregar banda</button>
          <div className="bands-table"><div className="bands-table-heading"><span>Desde</span>{intervalMode && <span>Hasta</span>}<span>Cumplimiento %</span><span/></div>
          {bands.map((band, index) => <div className="result-band-row" key={index}>
            <label><span>Desde</span><input aria-label={"Desde banda " + (index + 1)} type="text" inputMode={intervalMode ? "decimal" : "text"} placeholder={intervalMode ? "Sin límite inferior" : countBands ? "Ej. 3+" : "Ej. 2.5+"} value={band.minResult} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, minResult: e.target.value} : row))}/>{intervalMode && <select aria-label={"Inclusión desde banda " + (index + 1)} disabled={!band.minResult.trim()} value={String(band.includesMin)} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, includesMin: e.target.value === "true"} : row))}><option value="true">● Incluir desde (≥)</option><option value="false">○ Excluir desde (&gt;)</option></select>}</label>
            {intervalMode && <label><span>Hasta</span><input aria-label={"Hasta banda " + (index + 1)} type="text" inputMode="decimal" placeholder="Sin límite superior" value={band.maxResult} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, maxResult: e.target.value} : row))}/><select aria-label={"Inclusión hasta banda " + (index + 1)} disabled={!band.maxResult.trim()} value={String(band.includesMax)} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, includesMax: e.target.value === "true"} : row))}><option value="true">● Incluir hasta (≤)</option><option value="false">○ Excluir hasta (&lt;)</option></select></label>}
            <label><span>Cumplimiento %</span><input aria-label={"Cumplimiento banda " + (index + 1)} type="number" min="0" max="100" value={band.compliance} onChange={e => setBands(bands.map((row, i) => i === index ? {...row, compliance: e.target.value} : row))}/></label>
            <button type="button" className="delete-band-button" aria-label={"Eliminar banda " + (index + 1)} onClick={() => setBands(bands.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
            {intervalMode && <div className="interval-row-help">
              <span>Banda {index + 1}: {band.minResult.trim() || "−∞"} {band.minResult.trim() && band.includesMin ? "≤" : "<"} resultado {band.maxResult.trim() && band.includesMax ? "≤" : "<"} {band.maxResult.trim() || "+∞"} → {band.compliance.trim() || "—"}% de cumplimiento</span>
              {!bandValidation.success && bandValidation.error.issues.filter(issue => issue.path[0] === index).map((issue, issueIndex) => <small key={issueIndex} className="field-error">{issue.message}</small>)}
            </div>}
          </div>)}
          </div></div><div className="bands-preview-panel">
          {usesBands && <>
            {!intervalMode && <p>Los intervalos se forman a partir de los puntos.</p>}
            <ResultBandsPreview unit={historical ? "% de cambio" : contributing ? `${input?.measurementUnit ?? ""} (total)` : input?.measurementUnit} pointMode={bandMode === "INTERVALS" ? undefined : bandMode} bands={parsedBands} ranges={r} complete={bands.every(band => Boolean((intervalMode || band.minResult.trim()) && band.compliance.trim()))}/>
          </>}
          {!usesBands && <p>Agrega bandas para ver su cumplimiento y color.</p>}
          </div></div>
          </>}
        </details>
      </>}
      {selectedSemantics === "BINARY" && <p>Sí = 100% de cumplimiento. No = 0%.</p>}
    </div>
    {reasons.length > 0 && <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    <label><input type="checkbox" disabled={reasons.length > 0} checked={ready} onChange={e => setConfirmed(e.target.checked ? signature : "")}/>Confirmo estas reglas de evaluación.</label>
  </section>;
  return { fields: { ...fields, scoringApprovalStatus: ready ? "APPROVED" : "BLOCKED" }, ready, panel };
}

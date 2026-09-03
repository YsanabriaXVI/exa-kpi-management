import { normalizeDefinitionText } from "./normalize.js";
import type {
  CalculationPattern, ComparisonDirection, ComparisonIntent, ComparisonMode, Confidence,
  DefinitionAmbiguity, DefinitionSignals, KpiBehavior, KpiFamily, MissingConcept, Proposal,
  ResultSemantics, SuggestedBusinessQuestion, TargetHint,
} from "./vocabulary.js";

const proposal = <T>(value: T | null, confidence: Confidence, ...evidence: string[]): Proposal<T> => ({ value, confidence, evidence });
const matches = (text: string, pattern: RegExp) => pattern.test(text);
const hasExplicitRangeTarget = (text: string): boolean => /\bentre\s+\d+(?:\.\d+)?\s+y\s+\d+(?:\.\d+)?\b/.test(text) && /\b(temperatura|presion|nivel|humedad|velocidad|peso)\b/.test(text);

export function detectFamily(text: string): Proposal<KpiFamily> {
  if (matches(text, /\b(roa|d\/e|deuda sobre patrimonio|margen|contribucion bruta)\b/)) return proposal("FINANCE", "HIGH", "financial metric term");
  if (matches(text, /\b(accidente|accidentes|incidente|incidentes|robo|robos)\b/)) return proposal("INCIDENTS", "HIGH", "incident or safety event term");
  if (matches(text, /\b(costo|costos|gasto|gastos)\b/)) return proposal("COST", "HIGH", "cost or expense term");
  if (matches(text, /\b(venta|ventas|vender|renta|rentas|alquiler|alquileres)\b/)) return proposal("SALES", "HIGH", "sales or rental term");
  if (matches(text, /\b(cliente|clientes|satisfaccion al cliente)\b/)) return proposal("CLIENTS", "MEDIUM", "customer term");
  if (matches(text, /\b(inventario|rotacion de inventario)\b/)) return proposal("INVENTORY", "HIGH", "inventory term");
  if (matches(text, /\b(desuso|utilizacion|aprovechamiento)\b/)) return proposal("UTILIZATION", "HIGH", "utilization term");
  if (matches(text, /\b(tiempo|dias|horas|minutos)\b/)) return proposal("TIME", "MEDIUM", "time term");
  if (matches(text, /\b(falla|fallas|calidad|conformidad|conformidades)\b/)) return proposal("QUALITY", "HIGH", "quality term");
  if (matches(text, /\b(cierre|cierres|cumplimiento|a tiempo)\b/)) return proposal("COMPLIANCE", "MEDIUM", "compliance or deadline term");
  if (matches(text, /\b(mantenimiento|m&r)\b/)) return proposal("MAINTENANCE", "MEDIUM", "maintenance term");
  if (matches(text, /\b(km|kms|kilometro|kilometros|productividad|viaje|viajes|gate in|gate out)\b/)) return proposal("PRODUCTIVITY", "MEDIUM", "productivity or throughput term");
  if (matches(text, /\b(temperatura|presion|nivel|humedad|velocidad|peso)\b/)) return proposal("OTHER", "MEDIUM", "physical control metric");
  return proposal("UNKNOWN", "LOW");
}

export function detectUnitHint(text: string): Proposal<string> {
  if (hasAmbiguousChangeReporting(text)) return proposal(null, "LOW", "percentage target does not confirm whether Result is currency or achieved change");
  if (matches(text, /\b(costo|gasto).*\b(por|\/)(\s*)?(km|kms|kilometro|kilometros)\b|\busd\/km\b/)) return proposal("USD/KM", "HIGH", "cost per kilometer pattern");
  if (matches(text, /\bkm\/(cabezal|viaje)(\/mes)?\b/)) return proposal(text.match(/km\/(cabezal|viaje)(\/mes)?/)?.[0]?.toUpperCase() ?? "KM", "HIGH", "compound kilometer unit");
  if (matches(text, /\b(venta|ventas|vender|renta|rentas)\b/) && matches(text, /\b(aumentar|incrementar|crecimiento).*\bporcentaje\b/) && !matches(text, /\bporcentaje de (venta|ventas|renta|rentas)\b/)) return proposal("USD", "MEDIUM", "percentage is a change target; underlying sales remain monetary");
  if (matches(text, /\b(roa|porcentaje|margen|tasa)\b/)) return proposal("%", "HIGH", "percentage metric term");
  if (matches(text, /\btemperatura\b/) && matches(text, /\b(c|celsius|centigrados)\b/)) return proposal("CELSIUS", "HIGH", "explicit temperature unit");
  if (matches(text, /\b(galon|galones)\b/)) return proposal("GALLONS", "HIGH", "gallons term");
  if (matches(text, /\b(contenedor|contenedores)\b/)) return proposal("CONTAINERS", "HIGH", "containers term");
  if (matches(text, /\b(accidente|accidentes|incidente|incidentes|robo|robos)\b/)) return proposal("INCIDENTS", "HIGH", "incident term");
  if (matches(text, /\b(km|kms|kilometro|kilometros)\b/)) return proposal("KM", "HIGH", "kilometer term");
  if (matches(text, /\b(venta|ventas|renta|rentas|costo|costos|gasto|gastos)\b/)) return proposal("USD", "MEDIUM", "monetary business metric; currency requires configuration");
  if (matches(text, /\b(cliente|clientes)\b/)) return proposal("CLIENTS", "HIGH", "customers term");
  if (matches(text, /\b(equipo|equipos)\b/)) return proposal("EQUIPMENT", "HIGH", "equipment term");
  if (matches(text, /\b(hora|horas)\b/)) return proposal("HOURS", "HIGH", "hours term");
  return proposal(null, "LOW");
}

export function detectCadenceHint(text: string): Proposal<string> {
  if (matches(text, /\b(mensual|mensualmente|por mes|cada mes|\/mes)\b/)) return proposal("MONTHLY", "HIGH", "monthly cadence term");
  if (matches(text, /\b(trimestral|trimestralmente|cada trimestre)\b/)) return proposal("QUARTERLY", "HIGH", "quarterly cadence term");
  if (matches(text, /\b(semestral|semestralmente|cada semestre)\b/)) return proposal("SEMIANNUAL", "HIGH", "semiannual cadence term");
  if (matches(text, /\b(anual|anualmente|cada ano)\b/)) return proposal("ANNUAL", "HIGH", "annual cadence term");
  return proposal(null, "LOW");
}

function hasAmbiguousChangeReporting(text: string): boolean {
  return matches(text, /\b(reducir|disminuir)\b/) && matches(text, /\bporcentaje\b/) &&
    !matches(text, /\b(respecto|comparado|contra|vs|periodo anterior|ano anterior|mes anterior|trimestre anterior)\b/) &&
    !matches(text, /\b(costo|gasto).*(por|\/)\s*(km|contenedor|ventas|gps|genset)\b/);
}

export function detectResultSemantics(text: string): Proposal<ResultSemantics> {
  if (hasAmbiguousChangeReporting(text)) return proposal(null, "LOW", "percentage reduction does not identify the reported Result");
  if (matches(text, /\b(costo|gasto).*(por|\/)\s*(km|kms|contenedor|contenedores|gps|genset|ventas)\b|\bkm\/(cabezal|viaje)\b|\bd\/e\b/)) return proposal("RATIO", "HIGH", "per-unit or ratio pattern");
  if (matches(text, /\b(rotacion de inventario|d\/e)\b/)) return proposal("RATIO", "HIGH", "known business ratio");
  if (matches(text, /\b(roa|margen|porcentaje de|tasa de|porcentaje neto)\b/)) return proposal("PERCENTAGE", "HIGH", "percentage business metric");
  if (matches(text, /\b(numero|cantidad)\b|\b(accidente|accidentes|incidente|incidentes|robo|robos|falla|fallas|cliente|clientes|contenedor|contenedores|viaje|viajes|orden|ordenes|equipo|equipos)\b/)) return proposal("COUNT", "HIGH", "countable entity term");
  if (matches(text, /\b(galon|galones|km|kms|kilometro|kilometros|temperatura|presion|nivel|humedad|velocidad|peso|hora|horas)\b/)) return proposal("QUANTITY", "HIGH", "physical quantity term");
  if (matches(text, /\b(venta|ventas|renta|rentas|costo|costos|gasto|gastos)\b/)) return proposal("ABSOLUTE_VALUE", "MEDIUM", "monetary metric term");
  return proposal(null, "LOW");
}

export function detectCalculationPattern(text: string): Proposal<CalculationPattern> {
  if (hasAmbiguousChangeReporting(text)) return proposal(null, "LOW", "reporting model is ambiguous");
  if (matches(text, /\bclima laboral|servicio de almacenamiento y m&r|satisfaccion al cliente\b/)) return proposal("MULTI_INPUT_CURRENT_PERIOD", "MEDIUM", "multiple relevant business signals without an approved formula");
  if (matches(text, /\b(roa|d\/e|margen|rotacion de inventario)\b/)) return proposal("DERIVED", "HIGH", "known accepted formula family");
  if (matches(text, /\b(costo|gasto).*(por|\/)\s*(km|contenedor|ventas|genset)\b/)) return proposal(null, "LOW", "ratio may be supplied directly or calculated from separate inputs");
  if (matches(text, /\b(venta|ventas|vender|cero|numero|cantidad|contenedor|contenedores|accidente|accidentes|km|kms|costo|gasto|temperatura|equipo|equipos|hora|horas)\b/)) return proposal("DIRECT", "MEDIUM", "observed current-period value pattern");
  return proposal(null, "LOW");
}

export function detectComparison(text: string): Readonly<{
  intent: ComparisonIntent;
  detected: boolean;
  mode: Proposal<ComparisonMode>;
}> {
  if (matches(text, /\b(mismo (periodo|mes|trimestre|semestre).*(ano anterior|ano pasado)|respecto al mismo (periodo|mes|trimestre|semestre).*ano anterior)\b/)) {
    return { intent: "EXPLICIT", detected: true, mode: proposal("SAME_PERIOD_PREVIOUS_YEAR", "HIGH", "same period previous year phrase") };
  }
  if (matches(text, /\b(periodo anterior|mes anterior|trimestre anterior|semestre anterior)\b/)) {
    return { intent: "EXPLICIT", detected: true, mode: proposal("PREVIOUS_PERIOD", "HIGH", "previous period phrase") };
  }
  if (matches(text, /\b(vs|respecto a|comparado con|contra)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|19\d{2}|20\d{2})\b/)) {
    return { intent: "EXPLICIT", detected: true, mode: proposal("CUSTOM_PERIOD", "MEDIUM", "explicit historical reference") };
  }
  if (matches(text, /\b(aumentar|incrementar|reducir|disminuir)\b/) && matches(text, /\bporcentaje\b/)) {
    return { intent: "POSSIBLE", detected: false, mode: proposal(null, "LOW", "change percentage lacks a comparison reference") };
  }
  return { intent: "NONE", detected: false, mode: proposal("NONE", "HIGH", "no explicit comparison language") };
}

export function detectComparisonDirection(text: string): Proposal<ComparisonDirection> {
  if (matches(text, /\b(reducir|reduccion|disminuir|disminucion)\b/)) return proposal("REDUCTION", "HIGH", "reduction verb");
  if (matches(text, /\b(aumentar|aumento|incrementar|incremento|crecer|crecimiento)\b/)) return proposal("INCREASE", "HIGH", "increase verb");
  return proposal(null, "LOW");
}

export function extractTargetHint(text: string, semantics = detectResultSemantics(text), unitHint = detectUnitHint(text)): TargetHint | null {
  const explicitRange = /\bentre\s+(\d+(?:\.\d+)?)\s+y\s+(\d+(?:\.\d+)?)\b/.exec(text);
  if (explicitRange?.[1] && explicitRange[2] && hasExplicitRangeTarget(text)) {
    const first = Number(explicitRange[1]);
    const second = Number(explicitRange[2]);
    return { minValue: Math.min(first, second), maxValue: Math.max(first, second), unit: unitHint.value ?? "UNKNOWN", kind: "RANGE_TARGET", confidence: "HIGH", evidence: ["explicit between-and interval", "identified business metric"] };
  }
  if (matches(text, /\brango\b|\b\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\b/)) return null;
  if (matches(text, /\bcero\b/) && semantics.value === "COUNT") return { value: 0, unit: unitHint.value ?? "COUNT", kind: "ABSOLUTE_TARGET", confidence: "HIGH", evidence: ["explicit zero target"] };
  const numeric = /(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/.exec(text);
  if (!numeric?.[1]) return null;
  const value = Number(numeric[1]);
  if (!Number.isFinite(value)) return null;
  const isPercentage = matches(text, new RegExp(`\\b${numeric[1].replace(".", "\\.")}\\s+porcentaje\\b`));
  const unit = isPercentage ? "PERCENT" : unitHint.value ?? (semantics.value === "COUNT" ? "COUNT" : semantics.value === "QUANTITY" ? "QUANTITY" : "ABSOLUTE_VALUE");
  if (matches(text, /\b(a mas tardar|antes del dia|antes de el dia)\b/)) return { value, unit: "DAY_OF_MONTH", kind: "DEADLINE", confidence: "HIGH", evidence: ["explicit deadline wording"] };
  if (matches(text, /\b(no exceder|no superar|maximo)\b/)) return { value, unit, kind: "UPPER_LIMIT", confidence: "HIGH", evidence: ["explicit maximum-limit wording"] };
  if (matches(text, /\b(al menos|minimo)\b/)) return { value, unit, kind: "LOWER_LIMIT", confidence: "HIGH", evidence: ["explicit minimum-limit wording"] };
  if (isPercentage && matches(text, /\b(aumentar|incrementar|crecimiento|reducir|disminuir|reduccion)\b/)) return { value, unit, kind: "CHANGE_TARGET", confidence: detectComparison(text).intent === "EXPLICIT" ? "HIGH" : "MEDIUM", evidence: ["directional wording with percentage target", detectComparison(text).intent === "EXPLICIT" ? "explicit comparison reference" : "comparison reference remains unresolved"] };
  if (semantics.value === "COUNT") return { value, unit, kind: "ABSOLUTE_TARGET", confidence: "HIGH", evidence: ["numeric target with countable entity"] };
  return { value, unit, kind: "ABSOLUTE_TARGET", confidence: isPercentage ? "HIGH" : "MEDIUM", evidence: [isPercentage ? "percentage expressed as KPI level" : "numeric target expression"] };
}

export function detectBehavior(text: string, semantics = detectResultSemantics(text)): Proposal<KpiBehavior> {
  if (hasAmbiguousChangeReporting(text)) return proposal(null, "LOW", "Result may be current value or achieved reduction");
  if (hasExplicitRangeTarget(text)) return proposal("RANGE", "HIGH", "explicit target interval for an identified business metric");
  if (matches(text, /\bmantener\b/)) return proposal(null, "LOW", "maintain may mean a maximum or tolerance around a target");
  if (matches(text, /\brango\b|\b\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\b/)) return proposal(null, "LOW", "range wording does not define evaluation behavior");
  if (matches(text, /\bcero\b/) && semantics.value === "COUNT") return proposal("ZERO_IS_BETTER", "HIGH", "explicit zero-event/count target");
  if ((matches(text, /\b(roa|margen|venta|ventas|vender|cliente|clientes|productividad|km|kms|rotacion|gate in|gate out)\b/) || matches(text, /\b(aumentar|incrementar)\b/) && semantics.value !== null) && !matches(text, /\bcosto|gasto\b/)) return proposal("GREATER_IS_BETTER", "HIGH", "clear favorable growth metric");
  if (matches(text, /\b(costo|costos|gasto|gastos|falla|fallas|desuso|dias de facturacion)\b/) && semantics.value !== null) return proposal("LOWER_IS_BETTER", "HIGH", "clear current cost, defect, unused asset, or duration metric");
  if (matches(text, /\b(no exceder|no superar|maximo)\b/) && semantics.value !== null) return proposal("LOWER_IS_BETTER", "HIGH", "explicit upper limit on a clear business metric");
  return proposal(null, "LOW");
}

export function detectAmbiguities(text: string): readonly DefinitionAmbiguity[] {
  const ambiguities: DefinitionAmbiguity[] = [];
  if (hasAmbiguousChangeReporting(text)) ambiguities.push({
    code: "RESULT_REPORTING_MEANING",
    explanation: "Result may mean the current indicator value or the improvement/reduction achieved.",
    evidence: ["reduction wording", "percentage target", "no explicit reporting model"],
    pendingDecision: "Choose what business value will be reported as Result.",
    possibleInterpretations: [
      { code: "CURRENT_INDICATOR_VALUE", description: "Report the current expense or indicator value.", behavior: "LOWER_IS_BETTER", resultSemantics: "ABSOLUTE_VALUE" },
      { code: "IMPROVEMENT_OR_REDUCTION_ACHIEVED", description: "Report the improvement or reduction achieved as a percentage.", behavior: "GREATER_IS_BETTER", resultSemantics: "CHANGE_PERCENT" },
    ],
  });
  const comparison = detectComparison(text);
  if (comparison.intent === "POSSIBLE") ambiguities.push({ code: "COMPARISON_REFERENCE", explanation: "A change percentage is present without an explicit comparison reference.", evidence: ["directional wording", "percentage target", "missing reference"], pendingDecision: "Choose whether and against which reference the KPI is compared." });
  if (matches(text, /\brango\b|\b\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\b/)) ambiguities.push({ code: "RANGE_MEANING", explanation: "The range may describe Result, Goal, Compliance, or another rule.", evidence: ["range wording or numeric interval"], pendingDecision: "Define what the range represents." });
  if (matches(text, /\bmantener\b/) && !hasExplicitRangeTarget(text)) ambiguities.push({ code: "MAINTAIN_MEANING", explanation: "Maintain may mean a maximum or a tolerance around a target.", evidence: ["maintain wording"], pendingDecision: "Define whether the KPI uses a limit or a tolerance around a target." });
  if (matches(text, /\bclima laboral|servicio de almacenamiento y m&r|satisfaccion al cliente\b/)) ambiguities.push({ code: "RESULT_UNIT", explanation: "Several reasonable current-period metrics could represent this KPI.", evidence: ["broad multi-signal business concept"], pendingDecision: "Define the official Result and its unit." });
  return ambiguities;
}

export function suggestBusinessQuestions(ambiguities: readonly DefinitionAmbiguity[]): readonly SuggestedBusinessQuestion[] {
  const codes = new Set(ambiguities.map(({ code }) => code));
  const questions: SuggestedBusinessQuestion[] = [];
  if (codes.has("RESULT_REPORTING_MEANING")) questions.push({ code: "HOW_RESULT_IS_REPORTED", prompt: "¿Cómo se reportará el resultado de este KPI?", options: [
    { code: "CURRENT_INDICATOR_VALUE", label: "Valor actual del indicador" },
    { code: "IMPROVEMENT_OR_REDUCTION_ACHIEVED", label: "Mejora o reducción conseguida" },
  ] });
  if (codes.has("COMPARISON_REFERENCE")) questions.push({ code: "WHAT_COMPARISON_REFERENCE", prompt: "¿Contra qué referencia debe compararse este KPI?", options: [
    { code: "PREVIOUS_PERIOD", label: "Período anterior" },
    { code: "SAME_PERIOD_PREVIOUS_YEAR", label: "Mismo período del año anterior" },
    { code: "CUSTOM_PERIOD", label: "Período histórico específico" },
    { code: "NONE", label: "Sin comparación histórica" },
  ] });
  if (codes.has("RANGE_MEANING")) questions.push({ code: "WHAT_RANGE_REPRESENTS", prompt: "¿Qué representa el rango indicado: Result, Goal, Compliance u otra regla?" });
  if (codes.has("MAINTAIN_MEANING")) questions.push({ code: "WHAT_MAINTAIN_MEANS", prompt: "¿Mantener significa no exceder un máximo o permanecer cerca de un objetivo con tolerancia?" });
  if (codes.has("RESULT_UNIT")) questions.push({ code: "WHAT_RESULT_UNIT", prompt: "¿Qué valor principal y qué unidad representan oficialmente este KPI?" });
  return questions;
}

function detectMissingConcepts(text: string, ambiguities: readonly DefinitionAmbiguity[], signals: Pick<DefinitionSignals, "behavior" | "resultSemantics" | "calculationPattern" | "unitHint" | "cadenceHint" | "comparisonIntent" | "comparisonMode">): readonly MissingConcept[] {
  const missing: MissingConcept[] = [];
  if (!signals.behavior.value || !signals.resultSemantics.value) missing.push("RESULT_MEANING");
  if (!signals.unitHint.value) missing.push("RESULT_UNIT");
  if (!signals.calculationPattern.value) missing.push("CALCULATION_FORMULA");
  if (signals.comparisonIntent === "POSSIBLE" && !signals.comparisonMode.value) missing.push("COMPARISON_MODE");
  if (!signals.cadenceHint.value) missing.push("CADENCE");
  if (ambiguities.some(({ code }) => code === "RESULT_UNIT")) {
    missing.push("RESULT_MEANING", "CALCULATION_FORMULA");
  }
  return [...new Set(missing)];
}

/** Foundation-only aggregation of deterministic signals. It does not persist or approve proposals. */
export function detectDefinitionSignals(originalText: string): DefinitionSignals {
  const normalizedText = normalizeDefinitionText(originalText);
  const family = detectFamily(normalizedText);
  const resultSemantics = detectResultSemantics(normalizedText);
  const behavior = detectBehavior(normalizedText, resultSemantics);
  const calculationPattern = detectCalculationPattern(normalizedText);
  const unitHint = detectUnitHint(normalizedText);
  const cadenceHint = detectCadenceHint(normalizedText);
  const targetHint = extractTargetHint(normalizedText, resultSemantics, unitHint);
  const comparison = detectComparison(normalizedText);
  const comparisonDirection = detectComparisonDirection(normalizedText);
  const ambiguities = detectAmbiguities(normalizedText);
  const suggestedQuestions = [...suggestBusinessQuestions(ambiguities)];
  const partial = { behavior, resultSemantics, calculationPattern, unitHint, cadenceHint, comparisonIntent: comparison.intent, comparisonMode: comparison.mode };
  const missingConcepts = detectMissingConcepts(normalizedText, ambiguities, partial);
  const status = !normalizedText || family.value === "UNKNOWN"
    ? "NEEDS_DETAIL"
    : ambiguities.length > 0 ? "NEEDS_CONFIRMATION" : "GOOD";
  return {
    originalText, normalizedText, family, behavior, resultSemantics, calculationPattern, unitHint, cadenceHint, targetHint,
    comparisonIntent: comparison.intent, comparisonDetected: comparison.detected, comparisonMode: comparison.mode,
    comparisonDirection, ambiguities, missingConcepts, suggestedQuestions, status,
  };
}

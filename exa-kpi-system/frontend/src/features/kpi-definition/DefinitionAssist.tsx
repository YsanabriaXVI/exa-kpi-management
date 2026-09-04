import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Eye, Info, X } from "lucide-react";
import type { AnalyzerResponse } from "./kpi-definition.types";
import { useDefinitionAssist } from "./useDefinitionAssist";
import { mergeDefinitionSuggestions, visibleDefinitionSuggestions } from "./visible-definition-suggestions";

const labels: Record<string, string> = {
  SALES: "Sales", COST: "Cost", PRODUCTIVITY: "Productivity", INCIDENTS: "Incidents", TIME: "Time",
  INVENTORY: "Inventory", UTILIZATION: "Utilization", QUALITY: "Quality", COMPLIANCE: "Compliance",
  CLIENTS: "Clients", MAINTENANCE: "Maintenance", FINANCE: "Finance", OTHER: "Other", UNKNOWN: "Unknown",
  GREATER_IS_BETTER: "Higher is better", LOWER_IS_BETTER: "Lower is better", ZERO_IS_BETTER: "Zero is best",
  RANGE: "Target range", EQUAL_IS_BETTER: "Exact value is best", BINARY: "Yes / no result", MILESTONE: "Milestone",
  ABSOLUTE_VALUE: "Absolute value", COUNT: "Count", QUANTITY: "Quantity", PERCENTAGE: "Percentage", RATIO: "Ratio", CHANGE_PERCENT: "Percentage change",
  DIRECT: "Direct result", DERIVED: "Calculated result", MULTI_INPUT_CURRENT_PERIOD: "Multiple current-period inputs", COMPOSITE: "Composite result",
  PREVIOUS_PERIOD: "Previous period", SAME_PERIOD_PREVIOUS_YEAR: "Same period previous year", CUSTOM_PERIOD: "Specific historical period",
  INCREASE: "Increase", REDUCTION: "Reduction", ABSOLUTE_TARGET: "Direct target", CHANGE_TARGET: "Change target",
  UPPER_LIMIT: "Maximum", LOWER_LIMIT: "Minimum", RANGE_TARGET: "Target range", DEADLINE: "Deadline",
  GOAL: "Goal", CADENCE: "Cadence", RESULT_UNIT: "Result unit", BEHAVIOR: "Behavior", RESULT_SEMANTICS: "Result meaning",
  CALCULATION_PATTERN: "Calculation method", COMPARISON_MODE: "Comparison reference",
  MONTHLY: "Monthly", WEEKLY: "Weekly", DAILY: "Daily", QUARTERLY: "Quarterly", YEARLY: "Yearly",
  PERCENT: "%", CONTAINERS: "containers", EQUIPMENT: "equipment", HOURS: "hours", CELSIUS: "°C", DAY_OF_MONTH: "day",
};
export const assistLabel = (value: string) => labels[value] ?? value.toLowerCase().replace(/_/g, " ").replace(/^./, (letter: string) => letter.toUpperCase());

function AnalysisPanel({ data, failed }: { data?: AnalyzerResponse; failed: boolean }) {
  if (failed) return <section className="definition-assist-panel unavailable" role="status">Definition Assist temporarily unavailable. You can still save this KPI.</section>;
  if (!data) return null;
  const statusCopy = data.analysisStatus === "GOOD" ? "Definition is understandable." : data.analysisStatus === "NEEDS_DETAIL" ? "This definition may benefit from a more specific concept." : "This KPI may need clarification when configured.";
  return <section className={`definition-assist-panel ${data.analysisStatus.toLowerCase()}`} aria-labelledby="definition-assist-title">
    <header><div>{data.analysisStatus === "GOOD" ? <CheckCircle2 size={18}/> : data.analysisStatus === "NEEDS_CONFIRMATION" ? <AlertTriangle size={18}/> : <Info size={18}/>}<div><h3 id="definition-assist-title">Definition Assist</h3><strong>{statusCopy}</strong></div></div><small>Suggestions only</small></header>
    {data.family.value && data.family.value !== "UNKNOWN" && <div className="assist-concept"><span>Suggested category</span><strong>{assistLabel(data.family.value)}</strong></div>}
    {data.ambiguities.length > 0 && <div className="assist-section"><h4>Possible meanings</h4>{data.ambiguities.map((ambiguity) => <article key={ambiguity.code}><p>{ambiguity.explanation}</p>{ambiguity.possibleInterpretations?.length ? <ul>{ambiguity.possibleInterpretations.map((item) => <li key={item.code}>{item.description}</li>)}</ul> : <small>{ambiguity.pendingDecision}</small>}</article>)}</div>}
    <p className="assist-later">{data.analysisStatus === "NEEDS_CONFIRMATION" ? "This will be resolved in KPI Configuration." : "Measurement details will be configured later."}</p>
  </section>;
}

type Props = { name: string; nameError?: string; isEdit: boolean; visibleDefinitions?: readonly import("./kpi-definition.types").KpiDefinition[]; children?: ReactNode; onNameChange: (name: string) => void; onViewExisting: (id: string) => void };
export function DefinitionAssist({ name, nameError, isEdit, visibleDefinitions = [], children, onNameChange, onViewExisting }: Props) {
  const { suggestionsName, suggestions, analysis } = useDefinitionAssist(name, !isEdit);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const listId = useId();
  const localSuggestions = visibleDefinitionSuggestions(name, visibleDefinitions);
  const items = mergeDefinitionSuggestions(suggestions.data?.suggestions ?? [], localSuggestions).filter((item) => !dismissedIds.includes(item.id));
  const eligible = name.trim().length >= 2;
  const suggestionsAreCurrent = localSuggestions.length > 0 || (suggestionsName === name.trim() && suggestions.data?.query.trim() === name.trim());
  useEffect(() => { setActiveIndex(items.length ? 0 : -1); }, [items.length]);
  useEffect(() => { setDismissedIds([]); }, [suggestionsName]);
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!eligible || isEdit) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.min(items.length - 1, current + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.max(0, current - 1)); }
    else if (event.key === "Enter" && open && activeIndex >= 0 && items[activeIndex]) { event.preventDefault(); onViewExisting(items[activeIndex].id); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
  };
  return <>
    <label className="form-field definition-name-field"><span>KPI Name</span><div className="definition-assist-suggestions">
      <input autoFocus value={name} onChange={(event) => { onNameChange(event.target.value); setOpen(true); }} placeholder="e.g. Crecimiento de ventas del Grupo EXA" aria-invalid={Boolean(nameError)} role={isEdit ? undefined : "combobox"} aria-expanded={isEdit ? undefined : open} aria-controls={isEdit ? undefined : listId} aria-autocomplete={isEdit ? undefined : "list"} aria-activedescendant={!isEdit && open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} onFocus={() => eligible && !isEdit && setOpen(true)} onKeyDown={keyDown}/>
      {suggestions.isError && <small className="assist-inline-error">Similar KPI search is unavailable. You can continue.</small>}
      {open && eligible && <section className="existing-kpis" aria-busy={!suggestionsAreCurrent}><header><div><h3>Possible existing KPIs</h3><p>Review similar reusable concepts before creating another Definition.</p></div>{!suggestionsAreCurrent && <span>Updating…</span>}</header>{!suggestionsAreCurrent ? <div className="suggestion-placeholder" role="status" aria-live="polite"><i/><i/><i/></div> : items.length > 0 ? <div id={listId} role="listbox" aria-label="Possible existing KPIs" className="suggestion-list">{items.map((item, index) => <div id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index} className={`suggestion-option ${activeIndex === index ? "active" : ""}`} key={item.id} onMouseEnter={() => setActiveIndex(index)}><button type="button" className="suggestion-view" onClick={() => onViewExisting(item.id)}><span><strong>{item.code}</strong>{item.name}</span><small>{item.matchType === "EXACT_OR_NEAR_DUPLICATE" ? "Possible duplicate" : assistLabel(item.matchType)}</small><b><Eye size={15}/>View</b></button><button type="button" className="suggestion-dismiss" aria-label={`Dismiss suggestion ${item.code}`} title="Dismiss suggestion" onClick={() => setDismissedIds((current) => [...current, item.id])}><X size={17}/></button></div>)}</div> : <p className="no-existing-kpis">No similar KPI Definitions found. You can continue with this name.</p>}</section>}
    </div>{nameError && <small className="field-error">{nameError}</small>}</label>
    {children}
    <AnalysisPanel data={analysis.data} failed={analysis.isError}/>
  </>;
}

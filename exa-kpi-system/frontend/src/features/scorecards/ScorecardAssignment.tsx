import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Link2, ListPlus, Save, Search, ShieldAlert, Target, UsersRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AssignmentKpi, AssignmentLinkedScorecard } from "./scorecard-assignment.data";
import { poolScopes } from "./CreateScorecardInfo";
import { scorecardService } from "./scorecard.service";
import { ActionToast } from "../../components/ActionToast";
import "./scorecard-assignment.css";
import "./scorecard-search-overrides.css";

function AssignmentWeightInput({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const handleChange = (rawValue: string) => {
    if (rawValue === "") {
      setDraft("");
      setError("");
      return;
    }

    const decimalValue = rawValue.replace(",", ".");
    if (!/^\d*(?:\.\d*)?$/.test(decimalValue)) {
      setError("Only zero or positive numeric values are allowed.");
      return;
    }

    const normalizedValue = decimalValue.replace(/^0+(?=\d)/, "");
    setDraft(normalizedValue);
    setError("");
    const numericValue = Number(normalizedValue);
    if (Number.isFinite(numericValue)) onChange(numericValue);
  };

  const handleBlur = () => {
    if (draft === "") {
      setDraft("0");
      onChange(0);
      setError("");
      return;
    }
    setDraft(String(Number(draft)));
  };

  return <div className="assignment-weight-field">
    <div className="assignment-weight-control">
      <label className={`assignment-weight-input ${error ? "invalid" : ""}`}>
        <input type="text" inputMode="decimal" value={draft} onChange={(event) => handleChange(event.target.value)} onBlur={handleBlur} aria-invalid={Boolean(error)} disabled={disabled} />
      </label>
      <span>%</span>
    </div>
    {error && <small className="assignment-weight-error" role="alert">{error}</small>}
  </div>;
}

export function ScorecardAssignment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedScorecardId = Number(searchParams.get("scorecardId") ?? 0);
  const readOnlyFromOverview = searchParams.get("source") === "overview";
  const selectionLocked = readOnlyFromOverview;
  const storedScorecardId = Number(window.localStorage.getItem("exa:scorecard-assignment:selected-scorecard"));
  const selectorMode = !requestedScorecardId || searchParams.get("selector") === "1";
  const scorecardId = requestedScorecardId || (selectorMode ? storedScorecardId : 0) || 0;
  const scorecardQuery = useQuery({ queryKey: ["scorecard", scorecardId], queryFn: () => scorecardService.getById(scorecardId), enabled: scorecardId > 0 });
  const scorecardsQuery = useQuery({ queryKey: ["scorecards"], queryFn: scorecardService.list, enabled: selectorMode });
  const periodsQuery = useQuery({ queryKey: ["scorecard-periods", scorecardId], queryFn: () => scorecardService.periods(scorecardId), enabled: scorecardId > 0 });
  const [periodKey, setPeriodKey] = useState(searchParams.get("period") ?? "");
  const selectedPeriod = periodsQuery.data?.find((period) => period.periodKey === periodKey);
  const compositionQuery = useQuery({ queryKey: ["scorecard-composition", scorecardId, periodKey], queryFn: () => scorecardService.composition(scorecardId, periodKey), enabled: scorecardId > 0 && Boolean(periodKey) && selectedPeriod?.scorecardCompositionStatus !== "UNAVAILABLE", retry: false });
  const [kpis, setKpis] = useState<AssignmentKpi[]>([]);
  const [linked, setLinked] = useState<AssignmentLinkedScorecard[]>([]);
  const [saved, setSaved] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [scopeDetailsOpen, setScopeDetailsOpen] = useState(false);
  const [activeScopeDepartment, setActiveScopeDepartment] = useState("");
  const [scopeModalPosition, setScopeModalPosition] = useState({ x: 0, y: 0 });
  const [lockedSelectionNotice, setLockedSelectionNotice] = useState(false);
  const [saveNotice, setSaveNotice] = useState(0);
  const scopeModalDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorUserEditedRef = useRef(false);
  const selectedScorecardLabel = scorecardQuery.data ? `${scorecardQuery.data.code} · ${scorecardQuery.data.name}` : "";
  const normalizeSelectorText = (value: string) => value.toLowerCase().replace(/·/g, " ").replace(/\s+/g, " ").trim();
  const isExactSelectedLabel = Boolean(selectedScorecardLabel) && normalizeSelectorText(selectorSearch) === normalizeSelectorText(selectedScorecardLabel);
  const selectorResults = useMemo(() => {
    const selectedLabel = scorecardQuery.data ? `${scorecardQuery.data.code} · ${scorecardQuery.data.name}` : "";
    const normalize = (value: string) => value.toLowerCase().replace(/·/g, " ").replace(/\s+/g, " ").trim();
    const normalizedSearch = normalize(selectorSearch);
    const term = selectedLabel && normalizedSearch === normalize(selectedLabel) ? "" : normalizedSearch;
    if (!term) return [];
    return (scorecardsQuery.data ?? []).filter((item) => normalize(`${item.code} ${item.name} ${item.poolSource}`).includes(term));
  }, [scorecardQuery.data, scorecardsQuery.data, selectorSearch]);
  useEffect(() => { if (!periodKey && periodsQuery.data?.length) setPeriodKey(periodsQuery.data.find((period) => period.scorecardCompositionStatus !== "UNAVAILABLE")?.periodKey ?? periodsQuery.data[0].periodKey); }, [periodKey, periodsQuery.data]);
  useEffect(() => { if (!compositionQuery.data) return; setKpis(compositionQuery.data.kpis.map((item) => ({ id: item.kpiConfigurationExternalId, configCode: item.configurationCode, code: item.definitionCode, name: item.definitionName, category: item.categoryName ?? "Not specified", goal: item.goal ?? "Not specified", measurementUnit: item.measurementUnit ?? "Not specified", source: item.dataSource ?? "Not specified", weight: Number(item.weight) }))); setLinked(compositionQuery.data.linkedScorecards.map((item) => ({ id: item.linkedScorecardId, code: item.code, name: item.name, company: item.companies.join(", ") || "Not specified", department: item.departments.join(", ") || "Not specified", frequency: scorecardQuery.data?.inputFrequency ?? "Not available", weight: Number(item.weight) }))); setSaved(true); }, [compositionQuery.data, scorecardQuery.data?.inputFrequency]);
  useEffect(() => {
    if (!selectorMode || !scorecardQuery.data || selectorUserEditedRef.current) return;
    setSelectorSearch(`${scorecardQuery.data.code} · ${scorecardQuery.data.name}`);
    setSelectorOpen(false);
  }, [scorecardQuery.data, selectorMode]);
  useEffect(() => {
    if (selectorMode && scorecardId) window.localStorage.setItem("exa:scorecard-assignment:selected-scorecard", String(scorecardId));
  }, [scorecardId, selectorMode]);
  useEffect(() => {
    if (!selectorOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setSelectorOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectorOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectorOpen]);
  useEffect(() => {
    if (!scopeDetailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScopeDetailsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [scopeDetailsOpen]);
  const kpiWeightTotal = kpis.reduce((sum, item) => sum + item.weight, 0);
  const linkedWeightTotal = linked.reduce((sum, item) => sum + item.weight, 0);
  const total = kpiWeightTotal + linkedWeightTotal;
  const visibleKpiWeight = Math.min(kpiWeightTotal, 100);
  const visibleLinkedWeight = Math.min(linkedWeightTotal, Math.max(0, 100 - visibleKpiWeight));
  const unassignedWeight = Math.max(0, 100 - total);
  const overassignedWeight = Math.max(0, total - 100);
  const status = total === 100 ? "completed" : total > 100 ? "overflown" : "incomplete";
  const missing = Math.abs(100 - total);

  const updateKpiWeight = (id: string, weight: number) => {
    setSaved(false);
    setKpis((items) => items.map((item) => item.id === id ? { ...item, weight: Math.max(0, weight) } : item));
  };
  const updateLinkedWeight = (id: string, weight: number) => {
    setSaved(false);
    setLinked((items) => items.map((item) => item.id === id ? { ...item, weight: Math.max(0, weight) } : item));
  };
  const saveMutation = useMutation({ mutationFn: () => scorecardService.updateWeights(scorecardId, periodKey, { kpis: kpis.map((item) => ({ kpiConfigurationExternalId: item.id, weight: item.weight })), linkedScorecards: linked.map((item) => ({ linkedScorecardId: item.id, weight: item.weight })) }), onSuccess: () => { setSaved(true); setSaveNotice(Date.now()); queryClient.invalidateQueries({ queryKey: ["scorecard-composition", scorecardId, periodKey] }); } });
  const save = () => saveMutation.mutate();
  const startScopeModalDrag = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    scopeModalDragRef.current = { startX: event.clientX, startY: event.clientY, originX: scopeModalPosition.x, originY: scopeModalPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveScopeModal = (event: React.PointerEvent<HTMLElement>) => {
    const drag = scopeModalDragRef.current;
    if (!drag) return;
    setScopeModalPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };
  const stopScopeModalDrag = (event: React.PointerEvent<HTMLElement>) => {
    scopeModalDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearScorecardSelection = () => {
    if (selectionLocked) {
      setLockedSelectionNotice(true);
      window.setTimeout(() => setLockedSelectionNotice(false), 4000);
      return;
    }
    window.localStorage.removeItem("exa:scorecard-assignment:selected-scorecard");
    setSelectorSearch("");
    setSelectorOpen(false);
    navigate(`/app/scorecards/assignment?selector=1${readOnlyFromOverview ? "&source=overview" : ""}`);
  };
  const scorecardSelector = <div className="assignment-scorecard-selector" ref={selectorRef}>
    <label><Search size={18} /><input value={selectorSearch} readOnly={selectionLocked} aria-readonly={selectionLocked} autoFocus={false} onFocus={() => { if (!selectionLocked) setSelectorOpen(true); }} onKeyDown={(event) => { if (selectionLocked && (event.key === "Backspace" || event.key === "Delete")) { event.preventDefault(); setLockedSelectionNotice(true); } }} onChange={(event) => { if (selectionLocked) { setLockedSelectionNotice(true); return; } const value = event.target.value; selectorUserEditedRef.current = true; setSelectorSearch(value); setSelectorOpen(true); const normalizedValue = normalizeSelectorText(value); const selectedCode = normalizeSelectorText(scorecardQuery.data?.code ?? ""); const keepsSelectedCode = Boolean(selectedCode) && (normalizedValue === selectedCode || normalizedValue.startsWith(`${selectedCode} `)); if (scorecardId && !keepsSelectedCode) { window.localStorage.removeItem("exa:scorecard-assignment:selected-scorecard"); navigate(`/app/scorecards/assignment?selector=1${readOnlyFromOverview ? "&source=overview" : ""}`); } }} placeholder="Select Option" /><button type="button" aria-label={selectionLocked ? "ScoreCard selection locked" : "Clear ScoreCard search"} title={selectionLocked ? "This ScoreCard cannot be removed from here" : "Clear search"} onClick={(event) => { event.preventDefault(); event.stopPropagation(); clearScorecardSelection(); }}>{selectionLocked ? <ShieldAlert size={17} /> : <X size={17} />}</button></label>
    {selectorOpen && !isExactSelectedLabel && <div className="assignment-scorecard-options">{scorecardsQuery.isLoading ? <p>Loading ScoreCards...</p> : !selectorSearch.trim() ? <p>Escribe para ver sugerencias.</p> : selectorResults.length ? selectorResults.map((item) => <button type="button" key={item.id} onClick={() => { window.localStorage.setItem("exa:scorecard-assignment:selected-scorecard", String(item.id)); setSelectorSearch(`${item.code} · ${item.name}`); setSelectorOpen(false); navigate(`/app/scorecards/assignment?scorecardId=${item.id}&selector=1`); }}><span className="code-pill">{item.code}</span><span><strong>{item.name}</strong><small>{item.poolSource}</small></span>{scorecardId === item.id && <Check size={17} />}</button>) : <p>No results found.</p>}</div>}
  </div>;

  if (selectorMode && !scorecardId) return <main className="scorecard-page assignment-page">
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>ScoreCard Assignment</span></nav>
    <header className="assignment-hero assignment-selector-hero"><div><h1>ScoreCard Assignment</h1><p>Search and select a ScoreCard to configure its final composition.</p>{scorecardSelector}</div><button type="button" className="assignment-back" onClick={() => navigate("/app/scorecards/overview")}><ChevronLeft size={16} /> Back</button></header>
    <section className="assignment-no-data"><span><Search size={38}/></span><h2>No Information Found</h2><p>Type a valid ScoreCard code or name, then select one of the suggestions to continue.</p></section>
  </main>;
  if (scorecardQuery.isLoading) return <main className="scorecard-page"><div className="scorecard-detail-loading">Loading assignment...</div></main>;
  if (!scorecardQuery.data) return null;
  const scorecard = scorecardQuery.data;
  const compositionReadOnly = compositionQuery.data?.status === "FINALIZED";
  const selectionQuery = `?scorecardId=${scorecardId}&period=${periodKey}`;
  const orderedDurationMonths = [...scorecard.durationMonths].sort((a, b) => a - b);
  const formatDurationMonth = (month: number) => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(scorecard.year, month, 1));
  const durationLabel = orderedDurationMonths.length
    ? orderedDurationMonths.length === 1
      ? `${formatDurationMonth(orderedDurationMonths[0])} ${scorecard.year}`
      : `${formatDurationMonth(orderedDurationMonths[0])} · ${formatDurationMonth(orderedDurationMonths[orderedDurationMonths.length - 1])} ${scorecard.year}`
    : "No duration";
  const scopeDepartments = (poolScopes[scorecard.poolSource]?.departments ?? []).filter((department) => scorecard.departments.includes(department.name));
  const activeDepartmentScope = scopeDepartments.find((department) => department.name === activeScopeDepartment) ?? scopeDepartments[0];

  return <main className={`scorecard-page assignment-page ${selectorMode ? "assignment-data-loaded" : ""} ${readOnlyFromOverview ? "assignment-read-only" : ""}`} key={scorecardId}>
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>ScoreCard Assignment</span></nav>
    <header className="assignment-hero">
      <div><h1>ScoreCard Assignment</h1>{selectorMode ? scorecardSelector : <div className="assignment-record-summary"><div><small>ScoreCard Code</small><strong>{scorecard.code}</strong></div><div><small>ScoreCard Name</small><strong>{scorecard.name}</strong></div></div>}<p>Define the final composition. Only the weight of selected items can be edited here.</p></div>
    </header>
    <section className="assignment-computed-fields" aria-label="Selected Input Period">
      <article><span><CalendarDays size={20} /></span><div><small>Input Period inherited from Pool</small><select value={periodKey} onChange={(event) => setPeriodKey(event.target.value)}>{periodsQuery.data?.map((period) => <option key={period.periodKey} value={period.periodKey}>{period.periodKey} · {period.scorecardCompositionStatus}</option>)}</select></div></article>
    </section>
    {periodsQuery.isError && <section className="assignment-no-data"><h2>Input Periods could not be loaded</h2><p>{(periodsQuery.error as Error).message}</p></section>}
    {selectedPeriod?.scorecardCompositionStatus === "UNAVAILABLE" && <section className="assignment-no-data"><Clock3 size={28}/><h2>Pool composition unavailable</h2><p>The Pool Composition must be finalized before Scorecard selection can begin for this Input Period.</p></section>}
    {compositionQuery.isError && <section className="assignment-no-data"><AlertTriangle size={28}/><h2>Composition contract unavailable</h2><p>{(compositionQuery.error as Error).message}</p></section>}
    {readOnlyFromOverview && <section className="assignment-read-only-banner" role="status"><span><ShieldAlert size={22} /></span><div><strong>Borrado no disponible desde ScoreCard Overview</strong><p>No se puede borrar desde aquí. Puedes editar pesos, agregar KPIs y vincular ScoreCards; usa el sidebar para las acciones administrativas.</p></div></section>}
    <div className="assignment-back-row"><button type="button" className="assignment-back" onClick={() => navigate(selectorMode ? "/app/scorecards/overview" : `/app/scorecards/detail?scorecardId=${scorecardId}`)}><ChevronLeft size={16} /> Back</button></div>

    <section className="assignment-computed-fields" aria-label="Computed ScoreCard information">
      <article>
        <span><CalendarDays size={20} /></span>
        <div><small>Duration from Pool</small><strong>{durationLabel}</strong></div>
      </article>
      <article>
        <span><Clock3 size={20} /></span>
        <div><small>Input Frequency</small><strong>{scorecard.inputFrequency}</strong></div>
      </article>
      <article className="assignment-computed-scope">
        <span><UsersRound size={20} /></span>
        <div><small>Scope</small><strong>{scorecard.departments.length} departments · {scorecard.collaborators} collaborators</strong></div>
        <button type="button" onClick={() => { setActiveScopeDepartment(scopeDepartments[0]?.name ?? ""); setScopeModalPosition({ x: 0, y: 0 }); setScopeDetailsOpen(true); }}><Eye size={16} />View details</button>
      </article>
    </section>

    <section className={`assignment-weight-status ${status}`}>
      <div className="assignment-weight-copy">
        <span className="assignment-status-icon">{status === "completed" ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}</span>
        <div><small>Total assigned weight</small><strong>{total}%</strong><p>{status === "completed" ? "Completed — the composition is ready." : status === "overflown" ? `Overflown — reduce the assignment by ${missing}%.` : `Incomplete — ${missing}% remaining to reach 100%.`}</p></div>
        <span className="assignment-status-pill">{status === "completed" ? "Completed" : status === "overflown" ? "Overflown" : "Incomplete"}</span>
      </div>
      <div className="assignment-weight-scale"><span>0%</span><span>Target 100%</span></div>
      <div className="assignment-weight-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={total}>
        <span style={{ width: `${Math.min(total, 100)}%` }} />
        <i style={{ left: `${Math.min(total, 100)}%` }} />
      </div>
    </section>

    <section className="assignment-section">
      <header><div><span><Target size={19} /></span><div><h2>KPIs from Pool</h2><p>{kpis.length} selected from {scorecard.poolSource}</p></div></div>{!compositionReadOnly && <button type="button" onClick={() => navigate(`/app/scorecards/assignment/select-kpis-from-pool${selectionQuery}`)}><ListPlus size={14} />Select KPIs from Pool</button>}</header>
      <div className="assignment-table-wrap"><table className="assignment-table"><thead><tr><th>KPI Config</th><th>KPI</th><th>KPI Category</th><th>Goal</th><th>Measurement Unit</th><th>Data Source</th><th>Weight</th></tr></thead><tbody>
        {kpis.map((kpi) => <tr key={kpi.id}><td><span className="code-pill">{kpi.configCode}</span></td><td><strong>{kpi.name}</strong><small>{kpi.code}</small></td><td>{kpi.category}</td><td>{kpi.goal}</td><td>{kpi.measurementUnit}</td><td>{kpi.source}</td><td><AssignmentWeightInput value={kpi.weight} disabled={compositionReadOnly} onChange={(weight) => updateKpiWeight(kpi.id, weight)} /></td></tr>)}
      </tbody></table></div>
      <div className="assignment-table-total"><span>Total KPI Weight:</span><strong>{kpiWeightTotal}%</strong></div>
    </section>

    <section className="assignment-section linked">
      <header><div><span><Link2 size={19} /></span><div><h2>Linked ScoreCards</h2><p>{linked.length} ScoreCards linked to this composition</p></div></div>{!compositionReadOnly && <button type="button" onClick={() => navigate(`/app/scorecards/assignment/select-linked-scorecards${selectionQuery}`)}><Link2 size={14} />Add Linked ScoreCards</button>}</header>
      <div className="assignment-table-wrap"><table className="assignment-table"><thead><tr><th>Code</th><th>Linked ScoreCard</th><th>Companies</th><th>Departments</th><th>Frequency</th><th>Weight</th></tr></thead><tbody>
        {linked.map((item) => <tr key={item.id}><td><span className="code-pill">{item.code}</span></td><td><strong>{item.name}</strong><small>Linked contribution</small></td><td>{item.company}</td><td>{item.department}</td><td>{item.frequency}</td><td><AssignmentWeightInput value={item.weight} disabled={compositionReadOnly} onChange={(weight) => updateLinkedWeight(item.id, weight)} /></td></tr>)}
      </tbody></table></div>
      <div className="assignment-table-total"><span>Total Linked ScoreCard Weight:</span><strong>{linkedWeightTotal}%</strong></div>
    </section>

    <footer className="assignment-actions">
      <div className="assignment-actions-content">
        <span className="assignment-save-state">{saved ? "Changes saved" : "Changes are not saved yet."}</span>
        <div className="assignment-composition-summary">
          <div className="assignment-composition-labels">
            <span><i className="own" />KPI Performance <strong>{kpiWeightTotal}%</strong></span>
            <span><i className="linked" />Linked ScoreCards <strong>{linkedWeightTotal}%</strong></span>
            {unassignedWeight > 0 && <span><i className="remaining" />Unassigned <strong>{unassignedWeight}%</strong></span>}
            {overassignedWeight > 0 && <span className="over"><i />Over assigned <strong>{overassignedWeight}%</strong></span>}
          </div>
          <div className="assignment-composition-track" aria-label={`KPI Performance ${kpiWeightTotal}%, Linked ScoreCards ${linkedWeightTotal}%`}>
            <span className="own" style={{ width: `${visibleKpiWeight}%` }} />
            <span className="linked" style={{ width: `${visibleLinkedWeight}%` }} />
            <span className="remaining" style={{ width: `${unassignedWeight}%` }} />
          </div>
        </div>
      </div>
      <button type="button" className="button primary" disabled={total !== 100 || compositionReadOnly || saveMutation.isPending} onClick={save}><Save size={16} /> Save Assignment</button>
    </footer>
    {saveNotice > 0 && <ActionToast key={saveNotice} message="ScoreCard assignment saved successfully." onClose={() => setSaveNotice(0)} />}
    {lockedSelectionNotice && <ActionToast message="No se puede borrar el ScoreCard desde aquí. La selección está protegida al entrar desde ScoreCard Overview." tone="warning" onClose={() => setLockedSelectionNotice(false)} />}
    {scopeDetailsOpen && <div className="assignment-scope-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeDetailsOpen(false); }}>
      <section className="assignment-scope-dialog" style={{ transform: `translate(${scopeModalPosition.x}px, ${scopeModalPosition.y}px)` }} role="dialog" aria-modal="true" aria-labelledby="assignment-scope-title">
        <header title="Drag to move" onPointerDown={startScopeModalDrag} onPointerMove={moveScopeModal} onPointerUp={stopScopeModalDrag} onPointerCancel={stopScopeModalDrag}><div><span><UsersRound size={20} /></span><div><h2 id="assignment-scope-title">Computed Scope Details</h2><p>Organizational scope inherited from the selected KPI Pool.</p></div></div><button type="button" onClick={() => setScopeDetailsOpen(false)} aria-label="Close scope details"><X size={18} /></button></header>
        {activeDepartmentScope ? <div className="assignment-scope-browser">
          <nav aria-label="Associated departments"><small>Departments</small>{scopeDepartments.map((department) => <button type="button" className={department.name === activeDepartmentScope.name ? "active" : ""} key={department.name} onClick={() => setActiveScopeDepartment(department.name)}><span><strong>{department.name}</strong><small>{department.employees.length} collaborators</small></span><ChevronRight size={16} /></button>)}</nav>
          <section><header><div><strong>{activeDepartmentScope.name}</strong><small>{activeDepartmentScope.employees.length} associated collaborators</small></div></header><div>{activeDepartmentScope.employees.map((employee) => <article key={employee.id}><span>{employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{employee.name}</strong><small>{employee.company}</small></div><span className="assignment-scope-check"><Check size={12} /></span></article>)}</div></section>
        </div> : <div className="assignment-scope-empty">No collaborator details are available for this Pool.</div>}
        <footer><span>{scopeDepartments.reduce((total, department) => total + department.employees.length, 0)} associated collaborators in {scopeDepartments.length} departments</span><button type="button" onClick={() => setScopeDetailsOpen(false)}>Done</button></footer>
      </section>
    </div>}
  </main>;
}

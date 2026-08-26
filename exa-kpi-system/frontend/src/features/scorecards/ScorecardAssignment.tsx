import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpDown, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, Link2, ListPlus, Save, Search, Target, UsersRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AssignmentKpi, AssignmentLinkedScorecard } from "./scorecard-assignment.data";
import { poolScopes } from "./CreateScorecardInfo";
import { scorecardService, ScorecardApiError } from "./scorecard.service";
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

function formatPeriodKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return "Select Input Period";
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date)} • ${year}`;
}

function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatCompositionStatus(value?: string) {
  if (value === "FINALIZED") return { label: "Finalized", tone: "finalized" };
  if (value === "PREPARING") return { label: "Preparing", tone: "preparing" };
  if (value === "AVAILABLE" || value === "NOT_STARTED") return { label: "Not Started", tone: "not-started" };
  if (value === "UNAVAILABLE") return { label: "Future", tone: "future" };
  return { label: "Not Available", tone: "not-started" };
}

export function ScorecardAssignment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedScorecardId = Number(searchParams.get("scorecardId") ?? 0);
  const readOnlyFromOverview = searchParams.get("source") === "overview";
  const storedScorecardId = Number(window.localStorage.getItem("exa:scorecard-assignment:selected-scorecard"));
  const selectorMode = !requestedScorecardId || searchParams.get("selector") === "1";
  const scorecardId = requestedScorecardId || (selectorMode ? storedScorecardId : 0) || 0;
  const scorecardQuery = useQuery({ queryKey: ["scorecard", scorecardId], queryFn: () => scorecardService.getById(scorecardId), enabled: scorecardId > 0 });
  const scorecardsQuery = useQuery({ queryKey: ["scorecards"], queryFn: scorecardService.list, staleTime: 60 * 1000 });
  const periodsQuery = useQuery({ queryKey: ["scorecard-periods", scorecardId], queryFn: () => scorecardService.periods(scorecardId), enabled: scorecardId > 0 });
  const [periodKey, setPeriodKey] = useState(searchParams.get("period") ?? "");
  const selectedPeriod = periodsQuery.data?.find((period) => period.periodKey === periodKey);
  const compositionQuery = useQuery({ queryKey: ["scorecard-composition", scorecardId, periodKey], queryFn: () => scorecardService.composition(scorecardId, periodKey), enabled: scorecardId > 0 && Boolean(periodKey) && selectedPeriod?.scorecardCompositionStatus !== "UNAVAILABLE", retry: false });
  const [kpis, setKpis] = useState<AssignmentKpi[]>([]);
  const [linked, setLinked] = useState<AssignmentLinkedScorecard[]>([]);
  const [kpiSort, setKpiSort] = useState<{ key: keyof AssignmentKpi; direction: "asc" | "desc" }>({ key: "configCode", direction: "asc" });
  const [linkedSort, setLinkedSort] = useState<{ key: keyof AssignmentLinkedScorecard; direction: "asc" | "desc" }>({ key: "code", direction: "asc" });
  const [saved, setSaved] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [scopeDetailsOpen, setScopeDetailsOpen] = useState(false);
  const [activeScopeDepartment, setActiveScopeDepartment] = useState("");
  const [scopeModalPosition, setScopeModalPosition] = useState({ x: 0, y: 0 });
  const [saveNotice, setSaveNotice] = useState(0);
  const [finalizeNotice, setFinalizeNotice] = useState(0);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeAcknowledged, setFinalizeAcknowledged] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string[]>([]);
  const scopeModalDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorUserEditedRef = useRef(false);
  const selectedScorecardLabel = scorecardQuery.data ? `${scorecardQuery.data.code} · ${scorecardQuery.data.name}` : "";
  const normalizeSelectorText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.·—–_-]+/g, " ").replace(/\s+/g, " ").trim();
  const selectorResults = useMemo(() => {
    const selectedLabel = scorecardQuery.data ? `${scorecardQuery.data.code} · ${scorecardQuery.data.name}` : "";
    const normalizedSearch = normalizeSelectorText(selectorSearch);
    if (!normalizedSearch) return [];
    if (selectedLabel && normalizedSearch === normalizeSelectorText(selectedLabel)) return scorecardsQuery.data ?? [];
    const terms = normalizedSearch.split(" ").filter(Boolean);
    return (scorecardsQuery.data ?? []).filter((item) => { const candidate = normalizeSelectorText(`${item.code} ${item.name} ${item.poolSource}`); return terms.every((term) => candidate.includes(term)); });
  }, [scorecardQuery.data, scorecardsQuery.data, selectorSearch]);
  useEffect(() => { if (!periodKey && periodsQuery.data?.length) setPeriodKey(periodsQuery.data.find((period) => period.scorecardCompositionStatus !== "UNAVAILABLE")?.periodKey ?? periodsQuery.data[0].periodKey); }, [periodKey, periodsQuery.data]);
  useEffect(() => { if (!compositionQuery.data) return; setKpis(compositionQuery.data.kpis.map((item) => ({ id: item.kpiConfigurationExternalId, configCode: item.configurationCode, code: item.definitionCode, name: item.definitionName, category: item.categoryName ?? "Not specified", goal: item.goal ?? "Not specified", measurementUnit: item.measurementUnit ?? "Not specified", source: item.dataSource ?? "Not specified", weight: Number(item.weight) }))); setLinked(compositionQuery.data.linkedScorecards.map((item) => ({ id: item.linkedScorecardId, code: item.code, name: item.name, company: item.companies.join(", ") || "Not specified", department: item.departments.join(", ") || "Not specified", frequency: scorecardQuery.data?.inputFrequency ?? "Not available", weight: Number(item.weight) }))); setSaved(true); }, [compositionQuery.data, scorecardQuery.data?.inputFrequency]);
  useEffect(() => {
    if (!scorecardQuery.data || selectorUserEditedRef.current) return;
    setSelectorSearch(`${scorecardQuery.data.code} · ${scorecardQuery.data.name}`);
    setSelectorOpen(false);
  }, [scorecardQuery.data]);
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
  const stickyWeightScale = Math.max(100, total);
  const stickyKpiWidth = stickyWeightScale ? kpiWeightTotal / stickyWeightScale * 100 : 0;
  const stickyLinkedWidth = stickyWeightScale ? linkedWeightTotal / stickyWeightScale * 100 : 0;
  const stickyTrackWidth = total > 100 ? Math.min(112, 100 + (total - 100) * 0.6) : 100;
  const status = total === 100 ? "completed" : total > 100 ? "overflown" : "incomplete";
  const missing = Math.abs(100 - total);
  const sortedKpis = useMemo(() => [...kpis].sort((left, right) => String(left[kpiSort.key] ?? "").localeCompare(String(right[kpiSort.key] ?? ""), undefined, { numeric: true, sensitivity: "base" }) * (kpiSort.direction === "asc" ? 1 : -1)), [kpis, kpiSort]);
  const sortedLinked = useMemo(() => [...linked].sort((left, right) => String(left[linkedSort.key] ?? "").localeCompare(String(right[linkedSort.key] ?? ""), undefined, { numeric: true, sensitivity: "base" }) * (linkedSort.direction === "asc" ? 1 : -1)), [linked, linkedSort]);
  const toggleKpiSort = (key: keyof AssignmentKpi) => setKpiSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const toggleLinkedSort = (key: keyof AssignmentLinkedScorecard) => setLinkedSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

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
  const finalizeMutation = useMutation({ mutationFn: () => scorecardService.finalize(scorecardId, periodKey), onSuccess: async () => { setFinalizeOpen(false); setFinalizeAcknowledged(false); setFinalizeError([]); setFinalizeNotice(Date.now()); await Promise.all([queryClient.invalidateQueries({ queryKey: ["scorecard-composition", scorecardId, periodKey] }), queryClient.invalidateQueries({ queryKey: ["scorecard-periods", scorecardId] }), queryClient.invalidateQueries({ queryKey: ["scorecard", scorecardId] }), queryClient.invalidateQueries({ queryKey: ["scorecard-available", "kpi", scorecardId, periodKey] }), queryClient.invalidateQueries({ queryKey: ["scorecard-available", "linked", scorecardId, periodKey] })]); }, onError: async (error) => { const apiError = error instanceof ScorecardApiError ? error : null; const details = apiError?.details as { total?: string; conflicts?: Array<{ kpiConfigurationCode?: string; scorecardCode?: string; reasonCode?: string }> } | undefined; const issues = details?.conflicts?.map((conflict) => `${conflict.kpiConfigurationCode ?? "A KPI Configuration"} is no longer available${conflict.scorecardCode ? ` because it is used by ${conflict.scorecardCode}` : ""}.`) ?? []; setFinalizeError(issues.length ? issues : [apiError?.message ?? "The composition could not be finalized.", ...(details?.total ? [`Current composition weight is ${Number(details.total)}%. Required: 100%.`] : [])]); await Promise.all([queryClient.invalidateQueries({ queryKey: ["scorecard-composition", scorecardId, periodKey] }), queryClient.invalidateQueries({ queryKey: ["scorecard-periods", scorecardId] }), queryClient.invalidateQueries({ queryKey: ["scorecard-available", "kpi", scorecardId, periodKey] }), queryClient.invalidateQueries({ queryKey: ["scorecard-available", "linked", scorecardId, periodKey] })]); } });
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
    window.localStorage.removeItem("exa:scorecard-assignment:selected-scorecard");
    selectorUserEditedRef.current = false;
    setSelectorSearch("");
    setSelectorOpen(false);
    navigate(`/app/scorecards/assignment?selector=1${readOnlyFromOverview ? "&source=overview" : ""}`);
  };
  const scorecardSelector = <div className="assignment-scorecard-selector" ref={selectorRef}>
    <label><Search size={18} /><input value={selectorSearch} autoFocus={false} onFocus={() => setSelectorOpen(true)} onChange={(event) => { selectorUserEditedRef.current = true; setSelectorSearch(event.target.value); setSelectorOpen(true); }} placeholder="Search ScoreCards..." role="combobox" aria-expanded={selectorOpen} aria-controls="scorecard-assignment-suggestions" autoComplete="off" /><button type="button" aria-label="Clear ScoreCard search" title="Clear search" onClick={(event) => { event.preventDefault(); event.stopPropagation(); clearScorecardSelection(); }}><X size={17} /></button></label>
    {selectorOpen && <div className="assignment-scorecard-options" id="scorecard-assignment-suggestions" role="listbox">{scorecardsQuery.isLoading ? <p>Loading ScoreCards...</p> : selectorResults.length ? selectorResults.map((item) => <button type="button" role="option" aria-selected={scorecardId === item.id} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { window.localStorage.setItem("exa:scorecard-assignment:selected-scorecard", String(item.id)); selectorUserEditedRef.current = false; setSelectorSearch(`${item.code} · ${item.name}`); setSelectorOpen(false); navigate(`/app/scorecards/assignment?scorecardId=${item.id}&selector=1`); }}><span className="code-pill">{item.code}</span><span><strong>{item.name}</strong><small>{item.poolSource}</small></span>{scorecardId === item.id && <Check size={17} />}</button>) : <p className="assignment-scorecard-no-match"><Search size={18}/><strong>{selectorSearch.trim() ? "No matching ScoreCards" : "No ScoreCard entered"}</strong><span>{selectorSearch.trim() ? "The record may not exist. Try another code, name or KPI Pool." : "Type a ScoreCard code or name to see suggestions."}</span></p>}</div>}
  </div>;

  if (selectorMode && !scorecardId) return <main className="scorecard-page assignment-page">
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>ScoreCard Assignment</span></nav>
    <header className="assignment-hero assignment-selector-hero"><div><h1>ScoreCard Assignment</h1><p>Search and select a ScoreCard to configure its final composition.</p>{scorecardSelector}</div><button type="button" className="assignment-back" onClick={() => navigate("/app/scorecards/overview")}><ChevronLeft size={16} /> Back</button></header>
    <section className="assignment-no-data"><span><Search size={38}/></span><h2>No Information Found</h2><p>Type a valid ScoreCard code or name, then select one of the suggestions to continue.</p></section>
  </main>;
  if (scorecardQuery.isLoading) return <main className="scorecard-page"><div className="scorecard-detail-loading">Loading assignment...</div></main>;
  if (!scorecardQuery.data) return null;
  const scorecard = scorecardQuery.data;
  const selectorHasNoMatch = selectorUserEditedRef.current && !scorecardsQuery.isLoading && selectorResults.length === 0;
  if (selectorHasNoMatch) return <main className="scorecard-page assignment-page">
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>ScoreCard Assignment</span></nav>
    <div className="assignment-back-row assignment-back-top"><button type="button" className="assignment-back" onClick={() => navigate("/app/scorecards/overview")}><ChevronLeft size={16}/> Back</button></div>
    <header className="assignment-hero assignment-context-hero"><div><h1>ScoreCard Assignment</h1><p>Search and select a valid ScoreCard to configure its composition.</p></div></header>
    <section className="assignment-scorecard-search" aria-labelledby="assignment-scorecard-search-title"><div><h2 id="assignment-scorecard-search-title">Select ScoreCard</h2><p>Search by ScoreCard code, name or KPI Pool.</p></div>{scorecardSelector}</section>
    <section className="assignment-no-data assignment-scorecard-not-found"><span><Search size={38}/></span><h2>Selected ScoreCard Not Found</h2><p>The ScoreCard does not exist or the code or name may be misspelled. Review your search and select a valid suggestion.</p></section>
  </main>;
  const compositionReadOnly = compositionQuery.data?.status === "FINALIZED";
  const selectionQuery = `?scorecardId=${scorecardId}&period=${periodKey}`;
  const [poolCode, ...poolNameParts] = scorecard.poolSource.split(/\s*·\s*/);
  const poolName = poolNameParts.join(" · ");
  const poolScheduleLabel = scorecard.poolSchedule ? `${formatMonthYear(scorecard.poolSchedule.validFrom)} – ${formatMonthYear(scorecard.poolSchedule.validTo)} · ${scorecard.poolSchedule.frequency}` : "";
  const compositionStatus = formatCompositionStatus(compositionQuery.data?.status ?? selectedPeriod?.scorecardCompositionStatus);
  const finalizeDisabledReason = compositionReadOnly ? "This composition is already finalized." : !saved ? "Save your changes before finalizing this composition." : selectedPeriod?.poolCompositionStatus !== "FINALIZED" ? "The Pool Composition must be finalized before this Scorecard Composition." : total !== 100 ? "Composition weight must equal 100% before finalizing." : !kpis.length && !linked.length ? "Select at least one KPI or Linked Scorecard before finalizing." : null;
  const scopeDepartments = (poolScopes[scorecard.poolSource]?.departments ?? []).filter((department) => scorecard.departments.includes(department.name));
  const activeDepartmentScope = scopeDepartments.find((department) => department.name === activeScopeDepartment) ?? scopeDepartments[0];

  return <main className={`scorecard-page assignment-page ${selectorMode ? "assignment-data-loaded" : ""} ${readOnlyFromOverview ? "assignment-read-only" : ""} ${selectedPeriod?.scorecardCompositionStatus === "UNAVAILABLE" ? "assignment-period-unavailable" : ""}`} key={scorecardId}>
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>ScoreCard Assignment</span></nav>
    <div className="assignment-back-row assignment-back-top"><button type="button" className="assignment-back" onClick={() => navigate(selectorMode ? "/app/scorecards/overview" : `/app/scorecards/detail?scorecardId=${scorecardId}`)}><ChevronLeft size={16} /> Back</button></div>
    <header className="assignment-hero assignment-context-hero">
      <div><h1>ScoreCard Assignment</h1><div className="assignment-scorecard-identity"><strong>{scorecard.code}</strong><span>{scorecard.name}</span></div><p>Configure KPIs, Linked Scorecards and weights for the selected Input Period.</p></div>
    </header>
    <section className="assignment-scorecard-search" aria-labelledby="assignment-scorecard-search-title"><div><h2 id="assignment-scorecard-search-title">Select ScoreCard</h2><p>Search by ScoreCard code, name or KPI Pool.</p></div>{scorecardSelector}</section>
    <section className="assignment-period-context" aria-label="ScoreCard composition context">
      <article className="assignment-period-card"><span><CalendarDays size={20}/></span><div><small>Input Period</small><div className="assignment-period-select-row"><span className="assignment-period-select-control"><select value={periodKey} onChange={(event) => setPeriodKey(event.target.value)}>{periodsQuery.data?.map((period) => <option key={period.periodKey} value={period.periodKey}>{formatPeriodKey(period.periodKey)}</option>)}</select><ChevronDown size={17} aria-hidden="true"/></span></div><p>Inherited from {scorecard.poolSource}</p></div></article>
      <article className="assignment-pool-source-card"><span><Target size={20}/></span><div><small>KPI Pool Source</small><strong>{poolCode}</strong>{poolName && <b>{poolName}</b>}{poolScheduleLabel && <p>{poolScheduleLabel}</p>}</div></article>
      <article className="assignment-scope-context"><span><UsersRound size={20}/></span><div><small>Scope</small><strong>{scorecard.departments.length} Departments · {scorecard.collaborators} Collaborators</strong><button type="button" onClick={() => { setActiveScopeDepartment(scopeDepartments[0]?.name ?? ""); setScopeModalPosition({ x: 0, y: 0 }); setScopeDetailsOpen(true); }}><Eye size={15}/> View Details</button></div></article>
    </section>
    {periodsQuery.isError && <section className="assignment-no-data"><h2>Input Periods could not be loaded</h2><p>{(periodsQuery.error as Error).message}</p></section>}
    {selectedPeriod?.scorecardCompositionStatus === "UNAVAILABLE" && <section className="assignment-no-data"><Clock3 size={28}/><h2>Pool composition unavailable</h2><p>The Pool Composition must be finalized before Scorecard selection can begin for this Input Period.</p></section>}
    {compositionQuery.isError && <section className="assignment-no-data"><AlertTriangle size={28}/><h2>Composition contract unavailable</h2><p>{(compositionQuery.error as Error).message}</p></section>}
    <header className="assignment-selected-period-heading"><CalendarDays size={21}/><div><small>ScoreCard Composition Period</small><h2>{formatPeriodKey(periodKey).replace(" • ", " ")}</h2><p>KPIs, Linked ScoreCards and weights shown below apply only to this Input Period.</p></div></header>
    <div className="assignment-weight-overview">
    <section className={`assignment-weight-status composition-weight-card ${status}`}>
      <div className="assignment-weight-copy">
        <span className="assignment-status-icon">{status === "completed" ? <Check size={22} /> : <AlertTriangle size={22} />}</span>
        <div><small>Composition Weight</small><strong>{total} / 100%</strong><p>{status === "completed" ? "The composition weight is ready." : status === "overflown" ? `Reduce the assigned weight by ${missing}%.` : `${missing}% remaining to reach the required total.`}</p></div>
        <span className="assignment-status-pill">{status === "completed" ? "Ready" : status === "overflown" ? `${missing}% Over` : `${missing}% Remaining`}</span>
      </div>
      <div className="assignment-weight-scale"><span>0%</span><span>Target 100%</span></div>
      <div className="assignment-weight-track" role="progressbar" aria-label={`Total composition weight: ${total}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total}>
        <span style={{ width: `${Math.min(total, 100)}%` }} /><i style={{ left: `${Math.min(total, 100)}%` }} />
      </div>
    </section>
    <article className="assignment-weight-composition-status"><span>{compositionStatus.tone === "finalized" ? <Check size={22}/> : <Clock3 size={22}/>}</span><div><small>Composition Status</small><strong>{compositionStatus.label}</strong><p>{formatPeriodKey(periodKey)}</p></div></article>
    </div>

    <section className="assignment-section">
      <header><div><span><Target size={19} /></span><div><h2>KPIs from Pool</h2><p>{kpis.length} selected from {scorecard.poolSource}</p></div></div>{!compositionReadOnly && <button type="button" onClick={() => navigate(`/app/scorecards/assignment/select-kpis-from-pool${selectionQuery}`)}><ListPlus size={14} />Select KPIs from Pool</button>}</header>
      <div className="assignment-table-wrap"><table className="assignment-table"><thead><tr>{([...[{ key: "configCode", label: "KPI Config" }, { key: "name", label: "KPI" }, { key: "category", label: "KPI Category" }, { key: "goal", label: "Goal" }, { key: "measurementUnit", label: "Measurement Unit" }, { key: "source", label: "Data Source" }, { key: "weight", label: "Weight" }]] as Array<{ key: keyof AssignmentKpi; label: string }>).map((column) => <th key={column.key} aria-sort={kpiSort.key === column.key ? (kpiSort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" className={kpiSort.key === column.key ? "assignment-sort-header active" : "assignment-sort-header"} onClick={() => toggleKpiSort(column.key)}>{column.label}<ArrowUpDown size={14}/></button></th>)}</tr></thead><tbody>
        {sortedKpis.map((kpi) => <tr key={kpi.id}><td><span className="code-pill">{kpi.configCode}</span></td><td><strong>{kpi.name}</strong><small>{kpi.code}</small></td><td>{kpi.category}</td><td>{kpi.goal}</td><td>{kpi.measurementUnit}</td><td>{kpi.source}</td><td><AssignmentWeightInput value={kpi.weight} disabled={compositionReadOnly} onChange={(weight) => updateKpiWeight(kpi.id, weight)} /></td></tr>)}
      </tbody></table></div>
      <div className="assignment-table-total"><span>Total KPI Weight:</span><strong>{kpiWeightTotal}%</strong></div>
    </section>

    <section className="assignment-section linked">
      <header><div><span><Link2 size={19} /></span><div><h2>Linked ScoreCards</h2><p>{linked.length} ScoreCards linked to this composition</p></div></div>{!compositionReadOnly && <button type="button" onClick={() => navigate(`/app/scorecards/assignment/select-linked-scorecards${selectionQuery}`)}><Link2 size={14} />Add Linked ScoreCards</button>}</header>
      <div className="assignment-table-wrap"><table className="assignment-table"><thead><tr>{([...[{ key: "code", label: "Code" }, { key: "name", label: "Linked ScoreCard" }, { key: "company", label: "Companies" }, { key: "department", label: "Departments" }, { key: "frequency", label: "Frequency" }, { key: "weight", label: "Weight" }]] as Array<{ key: keyof AssignmentLinkedScorecard; label: string }>).map((column) => <th key={column.key} aria-sort={linkedSort.key === column.key ? (linkedSort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" className={linkedSort.key === column.key ? "assignment-sort-header active" : "assignment-sort-header"} onClick={() => toggleLinkedSort(column.key)}>{column.label}<ArrowUpDown size={14}/></button></th>)}</tr></thead><tbody>
        {sortedLinked.map((item) => <tr key={item.id}><td><span className="code-pill">{item.code}</span></td><td><strong>{item.name}</strong><small>Linked contribution</small></td><td>{item.company}</td><td>{item.department}</td><td>{item.frequency}</td><td><AssignmentWeightInput value={item.weight} disabled={compositionReadOnly} onChange={(weight) => updateLinkedWeight(item.id, weight)} /></td></tr>)}
      </tbody></table></div>
      <div className="assignment-table-total"><span>Total Linked ScoreCard Weight:</span><strong>{linkedWeightTotal}%</strong></div>
    </section>
    <div className="assignment-back-row assignment-back-bottom"><button type="button" className="assignment-back" onClick={() => navigate(selectorMode ? "/app/scorecards/overview" : `/app/scorecards/detail?scorecardId=${scorecardId}`)}><ChevronLeft size={16} /> Back</button></div>

    <footer className="assignment-actions">
      <div className="assignment-actions-content">
        <div className={`composition-save-state ${saved ? "saved" : "unsaved"}`}>{saved ? <Check size={17}/> : <AlertTriangle size={17}/>}<span>{saved ? "Changes saved" : "Unsaved changes"}</span></div>
        <div className="assignment-composition-summary">
          <div className="assignment-composition-labels"><span><i className="own" />KPI Weight <strong>{kpiWeightTotal}%</strong></span><span><i className="linked" />Linked ScoreCard Weight <strong>{linkedWeightTotal}%</strong></span>{total !== 100 && <span className={total > 100 ? "over" : "difference"}><i className={total > 100 ? "over" : "remaining"} />Difference <strong>{missing}% {total > 100 ? "Over" : "Remaining"}</strong></span>}</div>
          <div className={`assignment-weight-track assignment-composition-track ${total > 100 ? "extended" : ""}`} style={{ width: `${stickyTrackWidth}%` }} role="progressbar" aria-label={`Weight breakdown: KPI ${kpiWeightTotal}%, Linked ScoreCards ${linkedWeightTotal}%, total ${total}%`} aria-valuemin={0} aria-valuemax={Math.max(100, total)} aria-valuenow={total}>
            <span className="own" style={{ width: `${total > 100 ? stickyKpiWidth : visibleKpiWeight}%` }} /><span className="linked" style={{ width: `${total > 100 ? stickyLinkedWidth : visibleLinkedWeight}%` }} /><span className="remaining" style={{ width: `${unassignedWeight}%` }} />
          </div>
        </div>
      </div>
      <div className="assignment-primary-actions">
        {!compositionReadOnly && <button type="button" className="button primary" disabled={saved || saveMutation.isPending || finalizeMutation.isPending} onClick={save}><Save size={16} /> {saveMutation.isPending ? "Saving..." : "Save Assignment"}</button>}
        {!compositionReadOnly ? <span className="assignment-finalize-action" title={finalizeDisabledReason ?? "Finalize this Input Period composition."}><button type="button" className="button finalize-composition-button" disabled={Boolean(finalizeDisabledReason) || saveMutation.isPending || finalizeMutation.isPending} onClick={() => { setFinalizeAcknowledged(false); setFinalizeError([]); setFinalizeOpen(true); }}><Check size={16}/> Finalize Composition</button>{finalizeDisabledReason && <small>{finalizeDisabledReason}</small>}</span> : <span className="assignment-finalized-state"><Check size={16}/> Finalized</span>}
      </div>
    </footer>
    {saveNotice > 0 && <ActionToast key={saveNotice} message="ScoreCard assignment saved successfully." onClose={() => setSaveNotice(0)} />}
    {finalizeNotice > 0 && <ActionToast key={finalizeNotice} message={`Composition Finalized — ${formatPeriodKey(periodKey).replace(" • ", " ")}. This composition is read-only.`} onClose={() => setFinalizeNotice(0)} />}
    {finalizeOpen && <div className="assignment-finalize-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !finalizeMutation.isPending) setFinalizeOpen(false); }}><section className="assignment-finalize-dialog" role="dialog" aria-modal="true" aria-labelledby="finalize-composition-title"><header><div><span><Check size={20}/></span><div><h2 id="finalize-composition-title">Finalize Scorecard Composition</h2><p>This action finalizes only the selected Input Period.</p></div></div><button type="button" aria-label="Close" disabled={finalizeMutation.isPending} onClick={() => setFinalizeOpen(false)}><X size={18}/></button></header><dl className="assignment-finalize-context"><div><dt>Scorecard</dt><dd>{scorecard.code} · {scorecard.name}</dd></div><div><dt>Input Period</dt><dd>{formatPeriodKey(periodKey)}</dd></div><div><dt>KPI Pool</dt><dd>{scorecard.poolSource}</dd></div></dl><section className="assignment-finalize-summary"><h3>Composition Summary</h3><div><span>KPI Configurations<strong>{kpis.length}</strong></span><span>Linked Scorecards<strong>{linked.length}</strong></span><span>KPI Weight<strong>{kpiWeightTotal}%</strong></span><span>Linked Scorecard Weight<strong>{linkedWeightTotal}%</strong></span><span className="total">Total Composition Weight<strong>{total}%</strong></span></div></section><div className="assignment-finalize-warning"><AlertTriangle size={19}/><p>Finalizing this composition will lock the KPI selection, Linked Scorecards and assigned weights for {formatPeriodKey(periodKey).replace(" • ", " ")}.<span>After finalization, this composition becomes read-only and is preserved for historical traceability. The finalized composition will be available to downstream workflows.</span></p></div>{finalizeError.length > 0 && <section className="assignment-finalize-error" role="alert"><strong>Cannot finalize composition</strong><p>{finalizeError.length} issue{finalizeError.length === 1 ? "" : "s"} must be resolved:</p><ul>{finalizeError.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul></section>}<label className="assignment-finalize-acknowledgement"><input type="checkbox" checked={finalizeAcknowledged} disabled={finalizeMutation.isPending} onChange={(event) => setFinalizeAcknowledged(event.target.checked)}/><span>I understand that this composition will become read-only.</span></label><footer><button type="button" className="button secondary" disabled={finalizeMutation.isPending} onClick={() => setFinalizeOpen(false)}>Cancel</button><button type="button" className="button finalize-composition-button" disabled={!finalizeAcknowledged || finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>{finalizeMutation.isPending ? "Finalizing..." : "Finalize Composition"}</button></footer></section></div>}
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

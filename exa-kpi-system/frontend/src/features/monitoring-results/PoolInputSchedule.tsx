import { ArrowLeft, CalendarCheck2, CalendarClock, CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheckBig, Eye, LockKeyhole, Play, Search, ShieldCheck, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { attachedScorecards, inputPeriods, monitoringPools, type InputPeriod } from "./monitoring-results.data";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { MonitoringNoInformation, MonitoringPoolIdentity, MonitoringPoolSelector } from "./MonitoringPoolSelector";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import "./monitoring-results.css";

type ScheduleSortKey = "period" | "kpiLines" | "entered" | "missing" | "validation" | "status" | "closedAt";

function ScheduleMultiSelect({ placeholder, options, selected, onChange }: { placeholder: string; options: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleCount = useMultiSelectVisibleCount(rootRef, selected);
  const visible = selected.slice(0, visibleCount);
  const hiddenCount = selected.length - visible.length;
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, []);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <div className="schedule-filter-multiselect" ref={rootRef}><button type="button" className={open ? "open" : ""} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{!selected.length ? <span className="schedule-filter-placeholder">{placeholder}</span> : <span className="schedule-filter-chips">{visible.map((item) => <span className="schedule-filter-chip" key={item}>{item}<span role="button" tabIndex={0} aria-label={`Remove ${item}`} onClick={(event) => { event.stopPropagation(); toggle(item); }}><X size={12}/></span></span>)}{hiddenCount > 0 && <span className="schedule-filter-chip more">+{hiddenCount} more<span role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => { event.stopPropagation(); onChange(visible); }}><X size={12}/></span></span>}</span>}<ChevronDown size={16}/></button>{open && <div className="schedule-filter-options">{options.map((item) => { const checked = selected.includes(item); return <button type="button" className={checked ? "selected" : ""} key={item} onClick={() => toggle(item)}><i>{checked && <Check size={12}/>}</i>{item}</button>; })}</div>}</div>;
}

export function PoolInputSchedule() {
  const pageSize = 6;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pool = monitoringPools.find((item) => item.id === Number(searchParams.get("poolId"))) ?? monitoringPools[0];
  const openedFromOverview = searchParams.get("source") === "overview";
  const [hasPoolInformation, setHasPoolInformation] = useState(openedFromOverview);
  const [search, setSearch] = useState("");
  const [validationsSelected, setValidationsSelected] = useState<string[]>([]);
  const [entryStatusesSelected, setEntryStatusesSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: ScheduleSortKey; direction: SortDirection }>({ key: "period", direction: "asc" });
  const schedulePeriods = useMemo<InputPeriod[]>(() => {
    if (pool.generatedInputs <= inputPeriods.length) return inputPeriods.slice(0, pool.generatedInputs);
    const year = Number(pool.currentPeriod.split(" ").pop()) || new Date().getFullYear();
    const generated = Array.from({ length: pool.generatedInputs - inputPeriods.length }, (_, offset) => {
      const monthIndex = inputPeriods.length + offset;
      const date = new Date(year, monthIndex, 1);
      const month = date.toLocaleDateString("en-US", { month: "long" });
      const shortMonth = date.toLocaleDateString("en-US", { month: "short" });
      return { id: inputPeriods.length + offset + 1, shortLabel: `${shortMonth} ${date.getFullYear()}`, period: `${month} ${date.getFullYear()}`, kpiLines: pool.kpiLines, entered: null, missing: null, validation: "Locked" as const, status: "Locked" as const, closedAt: "" };
    });
    return [...inputPeriods, ...generated];
  }, [pool.currentPeriod, pool.generatedInputs, pool.kpiLines]);
  const periods = useMemo(() => schedulePeriods
    .filter((period) => `${period.period} ${period.shortLabel} ${period.status} ${period.validation}`.toLowerCase().includes(search.trim().toLowerCase())
      && (!validationsSelected.length || validationsSelected.includes(period.validation))
      && (!entryStatusesSelected.length || entryStatusesSelected.includes(period.status)))
    .sort((left, right) => compareSortValues(scheduleSortValue(left, sort.key), scheduleSortValue(right, sort.key), sort.direction)), [entryStatusesSelected, schedulePeriods, search, sort, validationsSelected]);
  const totalPages = Math.max(1, Math.ceil(periods.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedPeriods = periods.slice(pageStart, pageStart + pageSize);
  const validationOptions = [...new Set(schedulePeriods.map((period) => period.validation))];
  const entryStatusOptions = [...new Set(schedulePeriods.map((period) => period.status))];
  useEffect(() => setPage(1), [entryStatusesSelected, search, validationsSelected]);
  const sortBy = (key: ScheduleSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const linkedScorecards = attachedScorecards.length;

  return (
    <main className="monitor-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/monitoring-results">Monitoring Results</Link><span>/</span>
        <Link to="/app/monitoring-results/overview">Monitoring Overview</Link><span>/</span>
        <span aria-current="page">Pool Input Schedule</span>
      </nav>
      <header className="monitor-header schedule-header">
        <div><span className="monitor-eyebrow">POOL PERIOD CONTROL</span><h1>Pool Input Schedule</h1><p>Track all generated inputs across the Pool duration and identify which period must be completed before the next one becomes available.</p></div>
      </header>
      <MonitoringPoolSelector pool={pool} locked={openedFromOverview} onInformationStateChange={setHasPoolInformation}/>
      {hasPoolInformation ? <>

      {openedFromOverview && <section className="read-only-banner" role="status"><span><ShieldCheck size={20} /></span><div><strong>Pool Input Schedule is read-only</strong><p>No se puede modificar desde el Overview. Usa la opción correspondiente del sidebar para consultar este apartado y sus validaciones.</p></div><Link to={`/app/monitoring-results/pool-input-schedule?poolId=${pool.id}`}><ShieldCheck size={14} />Ir al apartado</Link></section>}

      <MonitoringPoolIdentity pool={pool}/>

      <section className="schedule-summary">
        <header><div><h2>Input Period Summary</h2><p>Pool progress is different from the status of the current input period.</p></div><div className="schedule-legend"><span><i className="closed" />Closed</span><span><i className="pending" />Pending</span><span><i className="locked" />Locked</span></div></header>
        <div className="schedule-overview">
          <div className="generated"><span><CalendarRange size={23}/></span><div><small>Generated Inputs</small><strong>{schedulePeriods.length}</strong><em>Total periods in this Pool</em></div></div>
          <div className="closed"><span><CircleCheckBig size={23}/></span><div><small>Inputs Closed</small><strong>{schedulePeriods.filter((period) => period.status.startsWith("Closed")).length}</strong><em>Completed periods</em></div></div>
          <div className="pending"><span><CalendarClock size={23}/></span><div><small>Pending Inputs</small><strong>{schedulePeriods.filter((period) => !period.status.startsWith("Closed") && period.status !== "Locked").length}</strong><em>Awaiting completion</em></div></div>
          <div className="locked"><span><LockKeyhole size={23}/></span><div><small>Locked Periods</small><strong>{schedulePeriods.filter((period) => period.status === "Locked").length}</strong><em>Not yet available</em></div></div>
        </div>
        <ol className="period-timeline">
          {schedulePeriods.map((period, index) => {
            const kind = period.status.startsWith("Closed") ? "closed" : period.status === "Locked" ? "locked" : "pending";
            return <li className={kind} key={period.id} tabIndex={0}><span>{kind === "closed" ? <CalendarCheck2 size={20} /> : kind === "locked" ? <LockKeyhole size={19} /> : <CalendarClock size={20} />}</span><strong>{period.shortLabel}</strong>{index < schedulePeriods.length - 1 && <i />}<div className="period-tooltip" role="tooltip"><strong>{period.period}</strong><span>KPI Lines: {pool.kpiLines}</span><span>Attached ScoreCards: {kind === "locked" ? "No data" : linkedScorecards}</span><span>KPI Lines Entered: {kind === "locked" ? "No data" : pool.resultsEntered}</span><span>Current Status: {kind === "locked" ? "No data" : pool.status.replace(/_/g, " ")}</span></div></li>;
          })}
        </ol>
        <div className="schedule-lock-note"><LockKeyhole size={16} /><span><strong>June 2026 is locked.</strong> May 2026 must be closed or closed with an approved exception before results can be entered.</span></div>
      </section>

      <section className="schedule-table-section">
        <header><div><h2>Generated Input Periods</h2><p>Periods generated automatically from Pool Duration and Input Frequency.</p></div></header>
        <div className="schedule-table-filters"><label className="schedule-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search period, status or validation..." />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear period search"><X size={16}/></button>}</label><ScheduleMultiSelect placeholder="Validation Status" options={validationOptions} selected={validationsSelected} onChange={setValidationsSelected}/><ScheduleMultiSelect placeholder="Entry Status" options={entryStatusOptions} selected={entryStatusesSelected} onChange={setEntryStatusesSelected}/></div>
        <div className="schedule-table-wrap"><table>
          <thead><tr><SortableTableHeader active={sort.key === "period"} direction={sort.direction} onSort={() => sortBy("period")}>Input Period</SortableTableHeader><SortableTableHeader active={sort.key === "kpiLines"} direction={sort.direction} onSort={() => sortBy("kpiLines")}>KPI Lines</SortableTableHeader><SortableTableHeader active={sort.key === "entered"} direction={sort.direction} onSort={() => sortBy("entered")}>Results Entered</SortableTableHeader><SortableTableHeader active={sort.key === "missing"} direction={sort.direction} onSort={() => sortBy("missing")}>Missing</SortableTableHeader><SortableTableHeader active={sort.key === "validation"} direction={sort.direction} onSort={() => sortBy("validation")}>Validation Status</SortableTableHeader><SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Entry Status</SortableTableHeader><SortableTableHeader active={sort.key === "closedAt"} direction={sort.direction} onSort={() => sortBy("closedAt")}>Closed At</SortableTableHeader><th>Actions</th></tr></thead>
          <tbody>{paginatedPeriods.map((period) => <tr key={period.id} className={period.status === "Locked" ? "locked-row" : ""}>
            <td><strong>{period.period}</strong></td><td>{period.kpiLines}</td><td>{period.entered === null ? "—" : `${period.entered}/${period.kpiLines}`}</td><td>{period.missing ?? "—"}</td>
            <td><span className={`schedule-badge validation-${period.validation.toLowerCase().replace(/ /g, "-")}`}>{period.validation}</span></td>
            <td><span className={`schedule-badge entry-${period.status.toLowerCase().replace(/ /g, "-")}`}>{period.status}</span></td><td>{period.closedAt || "—"}</td>
            <td>{period.status.startsWith("Closed") ? <button className="table-period-action" onClick={() => navigate(`/app/monitoring-results/detail?poolId=${pool.id}&period=${encodeURIComponent(period.shortLabel)}`)}><Eye size={14} />View</button> : period.status === "Validated" ? <button className="table-period-action close" onClick={() => navigate(`/app/monitoring-results/result-entry?poolId=${pool.id}&period=${encodeURIComponent(period.shortLabel)}&step=5`)}><Check size={14} />Close Period</button> : period.status === "Continue Entry" ? <button className="table-period-action continue" onClick={() => navigate(`/app/monitoring-results/result-entry?poolId=${pool.id}&period=${encodeURIComponent(period.shortLabel)}&step=2`)}><Play size={14} />Continue Entry</button> : <button className="table-period-action" onClick={() => navigate(`/app/monitoring-results/detail?poolId=${pool.id}&period=${encodeURIComponent(period.shortLabel)}`)}><Eye size={14} />View Details</button>}</td>
          </tr>)}</tbody>
        </table>{!periods.length && <p className="schedule-no-results">No input periods match your search.</p>}<footer className="schedule-table-pagination"><span>{periods.length ? `Showing ${pageStart + 1}-${Math.min(pageStart + pageSize, periods.length)} of ${periods.length} periods` : "Showing 0 periods"}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" className={pageNumber === currentPage ? "active" : ""} key={pageNumber} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={16}/></button></div></footer></div>
      </section>
      <button className="monitor-back schedule-bottom-back" onClick={() => navigate("/app/monitoring-results/overview")}><ArrowLeft size={16} />Back to Overview</button>
      </> : <MonitoringNoInformation/>}
    </main>
  );
}

function scheduleSortValue(period: InputPeriod, key: ScheduleSortKey) {
  if (key === "period") return period.id;
  const value = period[key];
  return value ?? -1;
}

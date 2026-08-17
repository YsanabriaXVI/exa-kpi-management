import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  attachedScorecards,
  monitoringPools,
  type AttachedKpi,
  type AttachedScorecard,
} from "./monitoring-results.data";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { MonitoringNoInformation, MonitoringPoolIdentity, MonitoringPoolSelector } from "./MonitoringPoolSelector";
import "./monitoring-results.css";

type AttachedKpiSortKey = keyof AttachedKpi | "weightedValue";
const periodMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function poolPeriodOptions(duration: string, frequency: string) {
  const year = duration.match(/(20\d{2})/)?.[1] ?? String(new Date().getFullYear());
  const quarterRange = duration.match(/Q([1-4])\s*-\s*Q([1-4])/i);
  if (frequency === "Quarterly" || quarterRange) {
    const start = Number(quarterRange?.[1] ?? 1);
    const end = Number(quarterRange?.[2] ?? 4);
    return Array.from({ length: end - start + 1 }, (_, index) => `Q${start + index} ${year}`);
  }
  const monthRange = duration.match(/([A-Za-z]{3})\s*-\s*([A-Za-z]{3})/);
  const start = Math.max(0, periodMonths.findIndex((month) => month.toLowerCase() === monthRange?.[1]?.toLowerCase()));
  const foundEnd = periodMonths.findIndex((month) => month.toLowerCase() === monthRange?.[2]?.toLowerCase());
  const end = foundEnd >= start ? foundEnd : 11;
  return periodMonths.slice(start, end + 1).map((month) => `${month} ${year}`);
}

function DepartmentMultiSelect({ options, selected, onChange, placeholder = "All departments" }: { options: string[]; selected: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleCount = useMultiSelectVisibleCount(rootRef, selected);
  const visibleDepartments = selected.slice(0, visibleCount);
  const hiddenCount = selected.length - visibleDepartments.length;
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <div className="attached-department-multiselect" ref={rootRef}>
    <button type="button" className={open ? "open" : ""} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {!selected.length ? <span className="attached-department-placeholder">{placeholder}</span> : <span className="attached-department-chips">{visibleDepartments.map((item) => <span className="attached-department-chip" key={item}>{item}<span role="button" tabIndex={0} aria-label={`Remove ${item}`} onClick={(event) => { event.stopPropagation(); toggle(item); }}><X size={12}/></span></span>)}{hiddenCount > 0 && <span className="attached-department-chip more">+{hiddenCount} more<span role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => { event.stopPropagation(); onChange(visibleDepartments); }}><X size={12}/></span></span>}</span>}
      <ChevronDown size={16}/>
    </button>
    {open && <div className="attached-department-options">{options.map((item) => { const checked = selected.includes(item); return <button type="button" className={checked ? "selected" : ""} key={item} onClick={() => toggle(item)}><i>{checked && <Check size={12}/>}</i>{item}</button>; })}</div>}
  </div>;
}

function attachedKpiSortValue(kpi: AttachedKpi, key: AttachedKpiSortKey) {
  if (key === "weightedValue")
    return kpi.weight === null || kpi.score === null
      ? -1
      : (kpi.weight * kpi.score) / 100;
  return kpi[key] ?? "";
}

function periodPosition(value: string) {
  const [label] = value.split(" ");
  const monthIndex = periodMonths.indexOf(label);
  if (monthIndex >= 0) return monthIndex;
  const quarter = /^Q([1-4])$/i.exec(label);
  return quarter ? Number(quarter[1]) - 1 : 0;
}

function scorecardsForPeriod(scorecards: AttachedScorecard[], selectedPeriod: string, currentPeriod: string) {
  const offset = periodPosition(selectedPeriod) - periodPosition(currentPeriod);
  return scorecards.map((scorecard, scorecardIndex) => {
    if (!offset) return { ...scorecard, period: selectedPeriod };
    const future = offset > 0;
    const previewScore = future ? 0 : Math.max(0, Math.min(100, scorecard.previewScore + offset * (1.4 + scorecardIndex * .25)));
    const kpis = scorecard.kpis.map((kpi, kpiIndex) => {
      if (future) return { ...kpi, result: "—", compliance: null, score: null, entryStatus: "Pending" as const, validation: "Missing" as const, trafficLight: "Caution" as const };
      if (kpi.score === null) return kpi;
      const score = Math.max(0, Math.min(100, kpi.score + offset * (1.2 + kpiIndex * .35)));
      return { ...kpi, score, compliance: score, trafficLight: score >= 90 ? "Excellent" as const : score >= 70 ? "Warning" as const : "Caution" as const };
    });
    return { ...scorecard, period: selectedPeriod, entryStatus: future ? "Pending Input" : "Closed", previewScore, kpis };
  });
}

export function AttachedScorecards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pool =
    monitoringPools.find(
      (item) => item.id === Number(searchParams.get("poolId")),
    ) ?? monitoringPools[0];
  const openedFromOverview = searchParams.get("source") === "overview";
  const [period, setPeriod] = useState(pool.currentPeriod);
  const [hasPoolInformation, setHasPoolInformation] = useState(openedFromOverview);
  const [search, setSearch] = useState("");
  const [departmentsSelected, setDepartmentsSelected] = useState<string[]>([]);
  const [entryStatusesSelected, setEntryStatusesSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const tableRef = useRef<HTMLDivElement>(null);
  const previousDepartmentFilter = useRef(departmentsSelected.join("\u0000"));
  const [expanded, setExpanded] = useState<string[]>([]);
  const [kpiSearches, setKpiSearches] = useState<Record<string, string>>({});
  const [kpiSorts, setKpiSorts] = useState<
    Record<string, { key: AttachedKpiSortKey; direction: SortDirection }>
  >({});
  const departments = [
    ...new Set(
      attachedScorecards.flatMap((scorecard) => scorecard.departments),
    ),
  ];
  const periods = useMemo(() => poolPeriodOptions(pool.duration, pool.frequency), [pool.duration, pool.frequency]);
  const periodScorecards = useMemo(() => scorecardsForPeriod(attachedScorecards, period, pool.currentPeriod), [period, pool.currentPeriod]);
  const entryStatuses = useMemo(() => [...new Set(periodScorecards.map((scorecard) => scorecard.entryStatus))], [periodScorecards]);
  const rows = useMemo(
    () =>
      periodScorecards.filter(
        (scorecard) =>
          (!search ||
            `${scorecard.code} ${scorecard.name}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!departmentsSelected.length || departmentsSelected.some((department) => scorecard.departments.includes(department))) &&
          (!entryStatusesSelected.length || entryStatusesSelected.includes(scorecard.entryStatus)),
      ),
    [departmentsSelected, entryStatusesSelected, periodScorecards, search],
  );
  const toggle = (code: string) =>
    setExpanded((items) =>
      items.includes(code)
        ? items.filter((item) => item !== code)
        : [...items, code],
    );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstVisibleIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(firstVisibleIndex, firstVisibleIndex + pageSize);
  useEffect(() => setPage(1), [departmentsSelected, entryStatusesSelected, search]);
  useEffect(() => { setPeriod(pool.currentPeriod); setEntryStatusesSelected([]); }, [pool.currentPeriod]);
  useEffect(() => setEntryStatusesSelected([]), [period]);
  useEffect(() => {
    const currentFilter = departmentsSelected.join("\u0000");
    if (previousDepartmentFilter.current === currentFilter) return;
    previousDepartmentFilter.current = currentFilter;
    const animationFrame = requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(animationFrame);
  }, [departmentsSelected]);

  return (
    <main className="monitor-page attached-scorecards-page">
      <nav className="kpi-breadcrumb">
        <Link to="/app/monitoring-results">Monitoring Results</Link>
        <span>/</span>
        <Link to="/app/monitoring-results/overview">Monitoring Overview</Link>
        <span>/</span>
        <span>Attached ScoreCards</span>
      </nav>
      <header className="monitor-header schedule-header">
        <div>
          <span className="monitor-eyebrow">POOL IMPACT</span>
          <h1>Attached ScoreCards</h1>
          <p>
            See which ScoreCards consume KPIs from this Pool, their assigned
            weights, and the estimated impact for the selected period.
          </p>
        </div>
      </header>
      <MonitoringPoolSelector pool={pool} locked={openedFromOverview} onInformationStateChange={setHasPoolInformation}/>
      {hasPoolInformation ? <>
      <MonitoringPoolIdentity pool={pool} period={period} periodOptions={periods} onPeriodChange={setPeriod}/>
      <section className="attached-section">
        <header>
          <div>
            <div className="attached-title-row">
              <h2>ScoreCards Attached to this Pool</h2>
              <span className="attached-scorecard-count">
                <strong>{rows.length}</strong> ScoreCards
              </span>
            </div>
            <p>
              Expand a row to inspect only the KPIs selected by that ScoreCard.
            </p>
          </div>
        </header>
        <div className="result-toolbar attached-toolbar">
          <label>
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ScoreCard..."
            />
          </label>
          <DepartmentMultiSelect options={departments} selected={departmentsSelected} onChange={setDepartmentsSelected}/>
          <DepartmentMultiSelect options={entryStatuses} selected={entryStatusesSelected} onChange={setEntryStatusesSelected} placeholder="All entry statuses"/>
        </div>
        <div className="attached-scorecards-table-wrap" ref={tableRef}>
          <table className="attached-scorecards-table">
            <thead>
              <tr>
                <th>Expand</th>
                <th>ScoreCard</th>
                <th>Departments</th>
                <th>Entry Status</th>
                <th>Selected KPIs</th>
                <th>Preview Score</th>
                <th>KPI Traffic Light</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((scorecard) => {
                const scorecardDetailId =
                  attachedScorecards.findIndex(
                    (item) => item.code === scorecard.code,
                  ) + 1;
                const isOpen = expanded.includes(scorecard.code);
                const green = scorecard.kpis.filter(
                  (kpi) => kpi.trafficLight === "Excellent",
                ).length;
                const warning = scorecard.kpis.filter(
                  (kpi) => kpi.trafficLight === "Warning",
                ).length;
                const caution = scorecard.kpis.filter(
                  (kpi) => kpi.trafficLight === "Caution",
                ).length;
                const kpiSearch = kpiSearches[scorecard.code] ?? "";
                const kpiSort = kpiSorts[scorecard.code] ?? {
                  key: "code" as const,
                  direction: "asc" as const,
                };
                const visibleKpis = scorecard.kpis
                  .filter(
                    (kpi) =>
                      !kpiSearch ||
                      `${kpi.code} ${kpi.name} ${kpi.unit} ${kpi.goal} ${kpi.entryStatus} ${kpi.trafficLight}`
                        .toLowerCase()
                        .includes(kpiSearch.toLowerCase()),
                  )
                  .sort((left, right) =>
                    compareSortValues(
                      attachedKpiSortValue(left, kpiSort.key),
                      attachedKpiSortValue(right, kpiSort.key),
                      kpiSort.direction,
                    ),
                  );
                const sortKpisBy = (key: AttachedKpiSortKey) =>
                  setKpiSorts((current) => ({
                    ...current,
                    [scorecard.code]: {
                      key,
                      direction:
                        kpiSort.key === key && kpiSort.direction === "asc"
                          ? "desc"
                          : "asc",
                    },
                  }));
                return (
                  <Fragment key={scorecard.code}>
                    <tr className={isOpen ? "expanded" : ""}>
                      <td>
                        <button
                          type="button"
                          className="expand-icon"
                          onClick={() => toggle(scorecard.code)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${scorecard.name}`}
                        >
                          {isOpen ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronRight size={17} />
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="attached-name">
                          <small>{scorecard.code}</small>
                          <strong>{scorecard.name}</strong>
                        </div>
                      </td>
                      <td>{scorecard.departments.join(", ")}</td>
                      <td>
                        <span
                          className={`schedule-badge entry-${scorecard.entryStatus.toLowerCase().replace(/ /g, "-")}`}
                        >
                          {scorecard.entryStatus}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {scorecard.kpis.length}/{pool.kpiLines}
                        </strong>
                      </td>
                      <td>
                        <strong className="preview-score">
                          {scorecard.previewScore.toFixed(2)}%
                        </strong>
                      </td>
                      <td>
                        <span className="light-counts">
                          <i className="green">{green}</i>
                          <i className="yellow">{warning}</i>
                          <i className="red">{caution}</i>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="attached-view"
                          onClick={() =>
                            navigate(
                              `/app/scorecards/detail?scorecardId=${scorecardDetailId}`,
                            )
                          }
                          aria-label={`Open ${scorecard.name} detail`}
                          title="View ScoreCard Detail"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="attached-expanded-row">
                        <td colSpan={8}>
                          <div className="attached-kpis">
                            <header>
                              <div>
                                <h3>Selected KPIs</h3>
                                <p>
                                  Weights are inherited from this ScoreCard
                                  assignment and cannot be edited here.
                                </p>
                              </div>
                              <span>
                                {scorecard.kpis.reduce(
                                  (sum, kpi) => sum + (kpi.weight ?? 0),
                                  0,
                                )}
                                % KPI weight shown
                              </span>
                            </header>
                            <label className="attached-kpi-search">
                              <Search size={16} />
                              <input
                                value={kpiSearch}
                                onChange={(event) =>
                                  setKpiSearches((current) => ({
                                    ...current,
                                    [scorecard.code]: event.target.value,
                                  }))
                                }
                                placeholder="Search KPIs in this ScoreCard..."
                              />
                              {kpiSearch && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setKpiSearches((current) => ({
                                      ...current,
                                      [scorecard.code]: "",
                                    }))
                                  }
                                  aria-label={`Clear KPI search for ${scorecard.code}`}
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </label>
                            <div className="schedule-table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <SortableTableHeader
                                      active={kpiSort.key === "code"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("code")}
                                    >
                                      KPI Code
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "name"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("name")}
                                    >
                                      KPI Name
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "unit"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("unit")}
                                    >
                                      Unit
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "goal"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("goal")}
                                    >
                                      Goal
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "result"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("result")}
                                    >
                                      Current Result
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "score"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("score")}
                                    >
                                      Score
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "weight"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("weight")}
                                    >
                                      Assigned Weight
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "weightedValue"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("weightedValue")}
                                    >
                                      Weighted Value
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "entryStatus"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("entryStatus")}
                                    >
                                      Entry Status
                                    </SortableTableHeader>
                                    <SortableTableHeader
                                      active={kpiSort.key === "trafficLight"}
                                      direction={kpiSort.direction}
                                      onSort={() => sortKpisBy("trafficLight")}
                                    >
                                      Traffic Light
                                    </SortableTableHeader>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleKpis.map((kpi) => (
                                    <tr key={kpi.code}>
                                      <td>
                                        <strong>{kpi.code}</strong>
                                      </td>
                                      <td>{kpi.name}</td>
                                      <td>{kpi.unit}</td>
                                      <td>{kpi.goal}</td>
                                      <td>{kpi.result}</td>
                                      <td>
                                        {kpi.score === null
                                          ? "—"
                                          : `${kpi.score}%`}
                                      </td>
                                      <td>
                                        {kpi.weight === null ? (
                                          <span className="no-weight">
                                            Not assigned
                                          </span>
                                        ) : (
                                          <strong>{kpi.weight}%</strong>
                                        )}
                                      </td>
                                      <td>
                                        {kpi.weight === null ||
                                        kpi.score === null
                                          ? "—"
                                          : `${((kpi.weight * kpi.score) / 100).toFixed(2)}%`}
                                      </td>
                                      <td><span className={`kpi-entry-status-badge ${kpi.entryStatus.toLowerCase().replace(/ /g, "-")}`}><i />{kpi.entryStatus}</span></td>
                                      <td>
                                        <span
                                          className={`traffic-status ${kpi.trafficLight.toLowerCase()}`}
                                        >
                                          <i />
                                          {kpi.trafficLight}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {!visibleKpis.length && (
                                <p className="schedule-no-results">
                                  No KPIs match this search.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <div className="monitor-empty">
              No attached ScoreCards match the selected filters.
            </div>
          )}
        </div>
        <footer className="monitor-pagination attached-table-pagination">
          <span>{rows.length ? `Showing ${firstVisibleIndex + 1}-${Math.min(firstVisibleIndex + pageSize, rows.length)} of ${rows.length} ScoreCards` : "Showing 0 ScoreCards"}</span>
          <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <PaginationControls page={currentPage} totalPages={totalPages} onPage={setPage} label="Attached ScoreCards pagination" className="attached-pagination-controls" />
        </footer>
        <button className="monitor-back schedule-bottom-back" onClick={() => navigate("/app/monitoring-results/overview")}><ArrowLeft size={16}/>Back to Overview</button>
      </section>
      </> : <MonitoringNoInformation/>}
    </main>
  );
}

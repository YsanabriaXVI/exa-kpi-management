import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Info,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { reportScorecards } from "./reports.data";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import "./reports.css";
import "./latest-scorecard-results.css";

type FilterOption = { value: string; label: string };

function ReportMultiSelect({ label, options, selected, onChange, searchable = false }: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const toggle = (value: string) => onChange(
    selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  );
  const remove = (event: React.MouseEvent, value: string) => {
    event.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div className="report-multiselect" ref={rootRef}>
      <button type="button" className={open ? "open" : ""} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {!selectedOptions.length ? <span className="report-filter-placeholder">{label}</span> : (
          <span className={`report-filter-chips ${hiddenCount > 0 ? "has-more" : ""}`}>
            {visibleOptions.map((option) => <span className="report-filter-chip" key={option.value}>
              <span>{option.label}</span>
              <span className="report-filter-chip-remove" onClick={(event) => remove(event, option.value)}><X size={12} /></span>
            </span>)}
            {hiddenCount > 0 && <span className="report-filter-chip report-filter-more"><span>+{hiddenCount} more</span><span className="report-filter-chip-remove" onClick={(event) => { event.stopPropagation(); onChange(visibleOptions.map((option) => option.value)); }}><X size={12} /></span></span>}
          </span>
        )}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="report-filter-options" role="listbox" aria-multiselectable="true">
          {searchable && <label className="report-option-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ScoreCards..." /></label>}
          <button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}>
            <span className="report-option-check">{!selected.length && <Check size={13} />}</span>All
          </button>
          {filteredOptions.map((option) => {
            const isSelected = selected.includes(option.value);
            return <button type="button" className={isSelected ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}>
              <span className="report-option-check">{isSelected && <Check size={13} />}</span>{option.label}
            </button>;
          })}
        </div>
      )}
    </div>
  );
}

export function LatestScorecardResults() {
  const navigate = useNavigate();
  const [scorecards, setScorecards] = useState<string[]>([]);
  const [departmentsSelected, setDepartmentsSelected] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [period, setPeriod] = useState("Latest Available Result");
  const [compositionView, setCompositionView] = useState<"Detailed" | "Relative">("Detailed");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const departments = [
    ...new Set(reportScorecards.flatMap((item) => item.departments)),
  ];
  const filtered = useMemo(
    () =>
      reportScorecards.filter(
        (item) =>
          (!scorecards.length || scorecards.includes(item.code)) &&
          (!departmentsSelected.length || item.departments.some((department) => departmentsSelected.includes(department))) &&
          (!statuses.length || statuses.includes(item.status)) &&
          (period === "Latest Available Result" || period === "Last 3 Periods" || item.period === "Jun 2026"),
      ),
    [departmentsSelected, period, scorecards, statuses],
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const average = filtered.length
    ? filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length
    : 0;
  const best = [...filtered].sort((a, b) => b.score - a.score)[0];
  const lowest = [...filtered].sort((a, b) => a.score - b.score)[0];
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <main className="reports-page latest-scorecard-results-page">
      <nav className="kpi-breadcrumb">
        <Link to="/app/reports">Reports</Link>
        <span>/</span>
        <span>Latest ScoreCard Results</span>
      </nav>
      <header className="reports-header">
        <div>
          <span>EXECUTIVE RESULTS</span>
          <h1>Latest ScoreCard Results</h1>
          <p>
            Review the most recent available performance for each ScoreCard
            according to the selected scope and period.
          </p>
        </div>
      </header>
      <section className="reports-filters">
        <header className="reports-filter-heading">
          <div>
            <Search size={18} />
            <span>
              <strong>Reports Filtering</strong>
              <small>Filters affect all summaries and cards</small>
            </span>
          </div>
        </header>
        <label>
          <span>ScoreCard Selection</span>
          <ReportMultiSelect searchable label="Search or select ScoreCards..." options={reportScorecards.map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` }))} selected={scorecards} onChange={(values) => { setScorecards(values); setPage(1); }} />
        </label>
        <label>
          <span>Departments</span>
          <ReportMultiSelect label="All EXA.SA departments" options={departments.map((item) => ({ value: item, label: item }))} selected={departmentsSelected} onChange={(values) => { setDepartmentsSelected(values); setPage(1); }} />
        </label>
        <label>
          <span>Status</span>
          <ReportMultiSelect label="All statuses" options={["Closed", "Closed with Exceptions", "Validated", "Submitted"].map((item) => ({ value: item, label: item }))} selected={statuses} onChange={(values) => { setStatuses(values); setPage(1); }} />
        </label>
        <label>
          <span>Period to Display</span>
          <select className="report-period-select" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>
            <option>Latest Available Result</option>
            <option>Current Period</option>
            <option>Last 3 Periods</option>
          </select>
        </label>
      </section>
      <section className="reports-summary">
        <div className="reports-summary-heading">
          <h2>ScoreCards Summary Trip</h2>
          <p>Overview based on the currently selected filters</p>
        </div>
        <article>
          <span>
            <Building2 size={18} />
          </span>
          <div>
            <small>ScoreCards Found</small>
            <strong>{filtered.length}</strong>
          </div>
        </article>
        <article>
          <span>
            <TrendingUp size={18} />
          </span>
          <div>
            <small>Average Score</small>
            <strong>{average.toFixed(2)}%</strong>
          </div>
        </article>
        <article>
          <span>
            <Award size={18} />
          </span>
          <div>
            <small>Best Performer</small>
            <strong>{best?.name ?? "No data"}</strong>
            <em>{best ? `${best.score.toFixed(2)}%` : "—"}</em>
          </div>
        </article>
        <article>
          <span>
            <ArrowRight size={18} />
          </span>
          <div>
            <small>Lowest Performer</small>
            <strong>{lowest?.name ?? "No data"}</strong>
            <em>{lowest ? `${lowest.score.toFixed(2)}%` : "—"}</em>
          </div>
        </article>
      </section>
      <div className="chart-view-filter">
        <span className="composition-view-label">Chart View <i className="report-tooltip" tabIndex={0} data-tooltip="Detailed divides the ring by Final Composition. Relative displays the Final Score using its performance color."><Info size={14} /></i></span>
        <div className="composition-view-toggle" role="group" aria-label="Composition view">
          {(["Detailed", "Relative"] as const).map((view) => (
            <button type="button" title={view === "Detailed" ? "Ring divided into KPI Performance, Linked ScoreCards and Gap" : "Ring based on the Final Score performance range"} className={compositionView === view ? "active" : ""} key={view} onClick={() => setCompositionView(view)}>{view}</button>
          ))}
        </div>
      </div>
      <section className="report-card-grid" key={[...scorecards, ...departmentsSelected, ...statuses, period].join("|")}>
        {visible.map((scorecard) => {
          const gap = Math.max(
            0,
            100 - scorecard.ownKpiWeight - scorecard.linkedWeight,
          );
          return (
            <article className="score-result-card" key={scorecard.code}>
              <header>
                <div>
                  <h2><span>{scorecard.code}</span> · {scorecard.name}</h2>
                </div>
                <span
                  className={`report-status ${scorecard.status.toLowerCase().replace(/ /g, "-")}`}
                >
                  <i />
                  {scorecard.status}
                </span>
              </header>
              <div className="score-result-meta">
                <div>
                  <small>Departments Included</small>
                  <strong>{scorecard.departments.join(", ")}</strong>
                </div>
                <div>
                  <small>Selected<br />Period</small>
                  <strong>{scorecard.period}</strong>
                </div>
                <div>
                  <small>KPI Pool Source</small>
                  <strong>Corporate KPI Pool</strong>
                </div>
              </div>
              <div className="score-result-body">
                <div
                  className="score-donut"
                  style={{
                    background: compositionView === "Detailed"
                      ? `conic-gradient(#8b4fc1 0 ${scorecard.ownKpiWeight}%, #238fd1 ${scorecard.ownKpiWeight}% ${scorecard.ownKpiWeight + scorecard.linkedWeight}%, #cfd5dd ${scorecard.ownKpiWeight + scorecard.linkedWeight}% 100%)`
                      : `conic-gradient(${scorecard.score < 65 ? "#e14b47" : scorecard.score <= 79 ? "#e7b51e" : "#1faf62"} 0 ${scorecard.score}%, var(--ems-border) ${scorecard.score}% 100%)`,
                  }}
                >
                  <span>
                    <strong>{scorecard.score.toFixed(1)}%</strong>
                    <small>Final Score</small>
                  </span>
                </div>
                <div className="score-composition">
                  <small>Final Composition</small>
                  <p>
                    <i
                      className="own"
                      style={{ width: `${scorecard.ownKpiWeight}%` }}
                    />
                    <i
                      className="linked"
                      style={{ width: `${scorecard.linkedWeight}%` }}
                    />
                    <i className="gap" style={{ width: `${gap}%` }} />
                  </p>
                  <span>
                    <i className="own" />
                    KPI Performance {scorecard.ownKpiWeight}%
                  </span>
                  <span>
                    <i className="linked" />
                    Linked ScoreCards {scorecard.linkedWeight}%
                  </span>
                  {gap > 0 && (
                    <span>
                      <i className="gap" />
                      Gap {gap}%
                    </span>
                  )}
                  <div className="composition-counts">
                    <strong>{Math.max(1, Math.round(scorecard.linkedWeight / 10))} Linked ScoreCards</strong>
                    <strong>{scorecard.kpis} KPIs Included</strong>
                  </div>
                </div>
              </div>
              <div className="traffic-summary">
                <small>KPIs Traffic Light</small>
                <p className="traffic-distribution">
                  <i className="green" style={{ width: `${(scorecard.green / scorecard.kpis) * 100}%` }} />
                  <i className="yellow" style={{ width: `${(scorecard.yellow / scorecard.kpis) * 100}%` }} />
                  <i className="red" style={{ width: `${(scorecard.red / scorecard.kpis) * 100}%` }} />
                </p>
                <span>
                  <span className="traffic-item"><i className="green" /><b>{scorecard.green}</b></span>
                  <span className="traffic-item"><i className="yellow" /><b>{scorecard.yellow}</b></span>
                  <span className="traffic-item"><i className="red" /><b>{scorecard.red}</b></span>
                </span>
              </div>
              <footer>
                <button
                  onClick={() => {
                    const historyParams = new URLSearchParams();
                    scorecard.departments.forEach((department) =>
                      historyParams.append("department", department),
                    );
                    navigate(
                      `/app/reports/scorecard-results-history?${historyParams.toString()}`,
                    );
                  }}
                >
                  <History size={14} />
                  View History
                </button>
                <button
                  onClick={() =>
                    navigate(
                      `/app/reports/scorecard-result-detail?scorecardCode=${encodeURIComponent(scorecard.code)}&from=overview`,
                    )
                  }
                >
                  <Eye size={14} />
                  View Details
                </button>
              </footer>
            </article>
          );
        })}
        {!visible.length && (
          <div className="reports-empty">
            No ScoreCards match the selected filters.
          </div>
        )}
      </section>
      <footer className="reports-pagination">
        <span>
          Showing <strong>{visible.length}</strong> of{" "}
          <strong>{filtered.length}</strong> ScoreCards
        </span>
        <div>
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            Page <strong>{page}</strong> of <strong>{pages}</strong>
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </main>
  );
}

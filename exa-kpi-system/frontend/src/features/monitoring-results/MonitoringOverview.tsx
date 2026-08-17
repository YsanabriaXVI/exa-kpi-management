import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  Filter,
  LayoutGrid,
  Link2,
  Search,
  Table2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import {
  monitoringPools,
  type MonitoringPool,
  type MonitoringStatus,
} from "./monitoring-results.data";
import { isMonitoringPeriodClosed } from "./monitoring-period-state";
import "./monitoring-results.css";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";

const statusLabels: Record<MonitoringStatus, string> = {
  ACTIVE: "Active",
  CONTINUE_ENTRY: "Continue Entry",
  SUBMITTED: "Submitted",
  VALIDATED: "Validated",
  VALIDATED_WITH_WARNINGS: "Validated with warnings",
  CLOSED: "Closed",
  LOCKED: "Not available yet",
};

type MonitoringFilterOption = { value: string; label: string };
const monitoringMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const monitoringFrequencyOptions: MonitoringFilterOption[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Trimestral" },
  { value: "Four-monthly", label: "Cuatrimestral" },
  { value: "Semiannual", label: "Semestral" },
  { value: "Annual", label: "Anual" },
];

function MonitoringMultiSelect({
  placeholder,
  options,
  selected,
  onChange,
}: {
  placeholder: string;
  options: MonitoringFilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) =>
    selected.includes(option.value),
  );
  const visibleCount = useMultiSelectVisibleCount(
    rootRef,
    selectedOptions.map((option) => option.label),
  );
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  return (
    <div className="monitor-multiselect" ref={rootRef}>
      <button
        type="button"
        className={open ? "open" : ""}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {!selectedOptions.length ? (
          <span className="monitor-filter-placeholder">{placeholder}</span>
        ) : (
          <span
            className={`monitor-filter-chips ${hiddenCount ? "has-more" : ""}`}
          >
            {visibleOptions.map((option) => (
              <span className="monitor-filter-chip" key={option.value}>
                <span>{option.label}</span>
                <span
                  className="monitor-filter-chip-remove"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.value);
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="monitor-filter-chip more">
                <span>+{hiddenCount} More</span>
                <span
                  className="monitor-filter-chip-remove"
                  role="button"
                  tabIndex={0}
                  aria-label="Remove additional selections"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(visibleOptions.map((option) => option.value));
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            )}
          </span>
        )}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          className="monitor-filter-options"
          role="listbox"
          aria-multiselectable="true"
        >
          <button
            type="button"
            className={!selected.length ? "selected" : ""}
            onClick={() => onChange([])}
          >
            <i>{!selected.length && <Check size={12} />}</i>All
          </button>
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                type="button"
                className={checked ? "selected" : ""}
                key={option.value}
                onClick={() => toggle(option.value)}
              >
                <i>{checked && <Check size={12} />}</i>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonitoringPeriodSelect({
  year,
  selectedMonths,
  onYearChange,
  onMonthsChange,
}: {
  year: number;
  selectedMonths: number[];
  onYearChange: (year: number) => void;
  onMonthsChange: (months: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  const toggleMonth = (monthIndex: number) =>
    onMonthsChange(
      selectedMonths.includes(monthIndex)
        ? selectedMonths.filter((item) => item !== monthIndex)
        : [...selectedMonths, monthIndex].sort((left, right) => left - right),
    );
  const visibleMonths = selectedMonths.slice(0, 2);
  const hiddenCount = selectedMonths.length - visibleMonths.length;
  return (
    <div className="monitor-period-picker" ref={rootRef}>
      <button
        type="button"
        className={open ? "open" : ""}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="monitor-period-trigger-content">
          <b>{year}</b>
          {visibleMonths.map((monthIndex) => (
            <i key={monthIndex}>
              {monitoringMonths[monthIndex]}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${monitoringMonths[monthIndex]}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMonth(monthIndex);
                }}
              >
                <X size={11} />
              </span>
            </i>
          ))}
          {hiddenCount > 0 && (
            <i className="monitor-period-more">
              +{hiddenCount} More
              <span
                role="button"
                tabIndex={0}
                aria-label="Remove additional months"
                onClick={(event) => {
                  event.stopPropagation();
                  onMonthsChange(visibleMonths);
                }}
              >
                <X size={11} />
              </span>
            </i>
          )}
          {!selectedMonths.length && <em>All months</em>}
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="monitor-period-panel">
          <div className="monitor-period-panel-header">
            <label>
              <span>Year</span>
              <input
                type="number"
                value={year}
                onChange={(event) => onYearChange(Number(event.target.value))}
              />
            </label>
            <label className="monitor-period-select-all">
              <input
                type="checkbox"
                checked={selectedMonths.length === monitoringMonths.length}
                onChange={(event) =>
                  onMonthsChange(
                    event.target.checked
                      ? monitoringMonths.map((_, index) => index)
                      : [],
                  )
                }
              />
              <i>
                {selectedMonths.length === monitoringMonths.length && (
                  <Check size={12} />
                )}
              </i>
              Select all months
            </label>
          </div>
          <div className="monitor-period-month-grid">
            {monitoringMonths.map((month, index) => (
              <label
                className={selectedMonths.includes(index) ? "selected" : ""}
                key={month}
              >
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(index)}
                  onChange={() => toggleMonth(index)}
                />
                <i>{selectedMonths.includes(index) && <Check size={11} />}</i>
                {month}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function primaryAction(pool: MonitoringPool) {
  switch (pool.status) {
    case "ACTIVE":
      return "Enter Results";
    case "CONTINUE_ENTRY":
      return "Continue Entry";
    case "SUBMITTED":
      return "Validate Results";
    case "VALIDATED":
      return "Close Period";
    case "VALIDATED_WITH_WARNINGS":
      return "Close with Exceptions";
    case "CLOSED":
      return "Period Closed";
    case "LOCKED":
      return "Not Available";
  }
}

export function MonitoringOverview() {
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [companiesSelected, setCompaniesSelected] = useState<string[]>([]);
  const [frequencies, setFrequencies] = useState<string[]>([]);
  const [periodYear, setPeriodYear] = useState(2026);
  const [periodMonths, setPeriodMonths] = useState<number[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [filterResetVersion, setFilterResetVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() =>
    window.localStorage.getItem("monitoring-overview-view") === "table"
      ? "table"
      : "cards",
  );
  const companies = [
    ...new Set(monitoringPools.flatMap((pool) => pool.companies)),
  ];
  const filtered = useMemo(
    () =>
      monitoringPools.filter((pool) => {
        const term = search.trim().toLowerCase();
        const periodParts = pool.currentPeriod.split(" ");
        const poolYear = Number(periodParts[periodParts.length - 1]);
        const monthlyIndex = monitoringMonths.findIndex((month) =>
          month.startsWith(periodParts[0]),
        );
        const quarterMatch = /^Q([1-4])$/.exec(periodParts[0]);
        const quarterMonths = quarterMatch
          ? [0, 1, 2].map(
              (offset) => (Number(quarterMatch[1]) - 1) * 3 + offset,
            )
          : [];
        const matchesPeriod =
          !periodMonths.length ||
          (poolYear === periodYear &&
            (periodMonths.includes(monthlyIndex) ||
              quarterMonths.some((month) => periodMonths.includes(month))));
        return (
          (!term || `${pool.code} ${pool.name}`.toLowerCase().includes(term)) &&
          (!companiesSelected.length ||
            companiesSelected.some((company) =>
              pool.companies.includes(company),
            )) &&
          (!frequencies.length || frequencies.includes(pool.frequency)) &&
          matchesPeriod &&
          (!statuses.length || statuses.includes(pool.status))
        );
      }),
    [
      companiesSelected,
      frequencies,
      periodMonths,
      periodYear,
      search,
      statuses,
    ],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstVisibleIndex = (currentPage - 1) * pageSize;
  const paginatedPools = filtered.slice(
    firstVisibleIndex,
    firstVisibleIndex + pageSize,
  );
  useEffect(
    () => setPage(1),
    [
      companiesSelected,
      frequencies,
      periodMonths,
      periodYear,
      search,
      statuses,
    ],
  );
  const hasActiveFilters = Boolean(
    search.trim() ||
    companiesSelected.length ||
    frequencies.length ||
    periodMonths.length ||
    statuses.length,
  );
  const clearFilters = () => {
    setSearch("");
    setCompaniesSelected([]);
    setFrequencies([]);
    setPeriodMonths([]);
    setPeriodYear(2026);
    setStatuses([]);
    setPage(1);
    setFilterResetVersion((current) => current + 1);
  };
  const changeViewMode = (mode: "cards" | "table") => {
    setViewMode(mode);
    window.localStorage.setItem("monitoring-overview-view", mode);
  };
  const getPoolView = (pool: MonitoringPool) => {
    const effectivePool: MonitoringPool = isMonitoringPeriodClosed(
      pool.id,
      pool.currentPeriod,
    )
      ? { ...pool, status: "CLOSED" }
      : pool;
    return {
      effectivePool,
      action: primaryAction(effectivePool),
      progress: Math.round((pool.closedInputs / pool.generatedInputs) * 100),
    };
  };
  const openPrimaryAction = (pool: MonitoringPool) => {
    const { effectivePool } = getPoolView(pool);
    const targetStep =
      effectivePool.status === "VALIDATED" ||
      effectivePool.status === "VALIDATED_WITH_WARNINGS"
        ? 5
        : effectivePool.status === "ACTIVE"
          ? 1
          : effectivePool.status === "CONTINUE_ENTRY"
            ? 2
            : effectivePool.status === "SUBMITTED"
              ? 3
              : 1;
    navigate(
      `/app/monitoring-results/result-entry?poolId=${pool.id}&period=${encodeURIComponent(pool.currentPeriod)}&step=${targetStep}`,
    );
  };

  return (
    <main className="monitor-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/monitoring-results">Monitoring Results</Link>
        <span>/</span>
        <span aria-current="page">Monitoring Overview</span>
      </nav>
      <header className="monitor-header">
        <div>
          <span className="monitor-eyebrow">RESULT CAPTURE & CONTROL</span>
          <h1>Monitoring Overview</h1>
          <p>
            Review every KPI Pool period, identify missing results, and continue
            the action permitted by its current status.
          </p>
        </div>
      </header>

      <section className="monitor-filters" aria-label="Monitoring filters">
        <div className="monitor-filter-heading">
          <Filter size={18} />
          <div>
            <strong>Monitoring Filters</strong>
            <small>Consultation only</small>
          </div>
        </div>
        <label className="monitor-search-field">
          <span>Pool Search</span>
          <span className="monitor-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Pool code or name..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear Pool Search"
                title="Clear Pool Search"
              >
                <X size={16} />
              </button>
            )}
          </span>
        </label>
        <div className="monitor-filter-grid">
          <label>
            <span>Company</span>
            <MonitoringMultiSelect
              key={`company-${filterResetVersion}`}
              placeholder="All companies"
              options={companies.map((value) => ({ value, label: value }))}
              selected={companiesSelected}
              onChange={setCompaniesSelected}
            />
          </label>
          <label>
            <span>Input Frequency</span>
            <MonitoringMultiSelect
              key={`frequency-${filterResetVersion}`}
              placeholder="All frequencies"
              options={monitoringFrequencyOptions}
              selected={frequencies}
              onChange={setFrequencies}
            />
          </label>
          <label>
            <span>Period</span>
            <MonitoringPeriodSelect
              key={`period-${filterResetVersion}`}
              year={periodYear}
              selectedMonths={periodMonths}
              onYearChange={setPeriodYear}
              onMonthsChange={setPeriodMonths}
            />
          </label>
          <label>
            <span>Entry Status</span>
            <MonitoringMultiSelect
              key={`status-${filterResetVersion}`}
              placeholder="All statuses"
              options={Object.entries(statusLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              selected={statuses}
              onChange={setStatuses}
            />
          </label>
        </div>
        <div className="monitor-filter-actions">
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <X size={15} />
            Clear Filters
          </button>
        </div>
      </section>

      <div className="monitor-view-toolbar">
        <span>{filtered.length} KPI Pools</span>
        <div className="monitor-view-toggle" role="group" aria-label="Display mode">
          <button
            type="button"
            className={viewMode === "table" ? "active" : ""}
            aria-pressed={viewMode === "table"}
            onClick={() => changeViewMode("table")}
          >
            <Table2 size={16} />
            Table
          </button>
          <button
            type="button"
            className={viewMode === "cards" ? "active" : ""}
            aria-pressed={viewMode === "cards"}
            onClick={() => changeViewMode("cards")}
          >
            <LayoutGrid size={16} />
            Cards
          </button>
        </div>
      </div>

      {viewMode === "cards" ? <section className="monitor-pool-grid">
        {paginatedPools.map((pool) => {
          const { effectivePool, action, progress } = getPoolView(pool);
          return (
            <article
              className={`monitor-pool-card status-${effectivePool.status.toLowerCase()}`}
              key={pool.id}
            >
              <header>
                <div>
                  <span>{pool.code}</span>
                  <h2>{pool.name}</h2>
                </div>
                <span className="monitor-status">
                  <i />
                  {statusLabels[effectivePool.status]}
                </span>
              </header>
              <div className="monitor-card-meta">
                <div>
                  <small>Company</small>
                  <strong>{pool.companies.join(", ")}</strong>
                </div>
                <div>
                  <small>Current Input</small>
                  <strong>{pool.currentPeriod}</strong>
                </div>
                <div>
                  <small>Generated Inputs</small>
                  <strong>{pool.generatedInputs} inputs</strong>
                </div>
              </div>
              <div className="monitor-progress-copy">
                <span>Pool Input Progress</span>
                <strong>
                  {pool.closedInputs}/{pool.generatedInputs} Closed ·{" "}
                  {pool.generatedInputs - pool.closedInputs} Pending
                </strong>
              </div>
              <div className="monitor-progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="monitor-metrics">
                <div>
                  <small>KPI Lines</small>
                  <strong>{pool.kpiLines}</strong>
                </div>
                <div>
                  <small>Results Entered</small>
                  <strong>
                    {pool.resultsEntered}/{pool.kpiLines}
                  </strong>
                </div>
                <div>
                  <small>Missing</small>
                  <strong>{pool.missing}</strong>
                </div>
              </div>
              <footer>
                <button
                  disabled={effectivePool.status === "CLOSED" || effectivePool.status === "LOCKED"}
                  className={`monitor-action primary-action action-${effectivePool.status.toLowerCase()}`}
                  onClick={() => openPrimaryAction(pool)}
                >
                  <ArrowRight size={14} />
                  {action}
                </button>
                <button
                  className="monitor-action"
                  onClick={() =>
                    navigate(`/app/monitoring-results/detail?poolId=${pool.id}`)
                  }
                >
                  <Eye size={14} />
                  View Details
                </button>
                <button
                  className="monitor-action attached"
                  onClick={() =>
                    navigate(
                      `/app/monitoring-results/attached-scorecards?poolId=${pool.id}&source=overview`,
                    )
                  }
                >
                  <Link2 size={14} />
                  Attached ScoreCards
                </button>
                <button
                  className="monitor-action schedule"
                  onClick={() =>
                    navigate(
                      `/app/monitoring-results/pool-input-schedule?poolId=${pool.id}&source=overview`,
                    )
                  }
                >
                  <CalendarDays size={14} />
                  Input Schedule
                </button>
              </footer>
            </article>
          );
        })}
        {!filtered.length && (
          <div className="monitor-empty">
            No KPI Pools match the selected filters.
          </div>
        )}
      </section> : (
        <section className="monitor-table-wrap" aria-label="KPI Pools table view">
          <table className="monitor-pool-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th>Company</th>
                <th>Current Input</th>
                <th>Input Progress</th>
                <th>KPI Lines</th>
                <th>Results</th>
                <th>Missing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPools.map((pool) => {
                const { effectivePool, action, progress } = getPoolView(pool);
                return (
                  <tr key={pool.id}>
                    <td><span className="monitor-table-code">{pool.code}</span><strong>{pool.name}</strong></td>
                    <td>{pool.companies.join(", ")}</td>
                    <td>{pool.currentPeriod}<small>{pool.generatedInputs} inputs</small></td>
                    <td><span>{pool.closedInputs}/{pool.generatedInputs} Closed</span><div className="monitor-progress"><i style={{ width: `${progress}%` }} /></div></td>
                    <td>{pool.kpiLines}</td>
                    <td>{pool.resultsEntered}/{pool.kpiLines}</td>
                    <td>{pool.missing}</td>
                    <td><span className={`monitor-status status-${effectivePool.status.toLowerCase()}`}><i />{statusLabels[effectivePool.status]}</span></td>
                    <td>
                      <div className="monitor-table-actions">
                        <button type="button" disabled={effectivePool.status === "CLOSED" || effectivePool.status === "LOCKED"} onClick={() => openPrimaryAction(pool)} title={action} aria-label={action}><ArrowRight size={15} /></button>
                        <button type="button" onClick={() => navigate(`/app/monitoring-results/detail?poolId=${pool.id}`)} title="View Details" aria-label="View Details"><Eye size={15} /></button>
                        <button type="button" onClick={() => navigate(`/app/monitoring-results/attached-scorecards?poolId=${pool.id}&source=overview`)} title="Attached ScoreCards" aria-label="Attached ScoreCards"><Link2 size={15} /></button>
                        <button type="button" onClick={() => navigate(`/app/monitoring-results/pool-input-schedule?poolId=${pool.id}&source=overview`)} title="Input Schedule" aria-label="Input Schedule"><CalendarDays size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={9} className="monitor-empty">No KPI Pools match the selected filters.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
      <footer className="monitor-pagination">
        <span>
          {filtered.length
            ? `Showing ${firstVisibleIndex + 1}-${Math.min(firstVisibleIndex + pageSize, filtered.length)} of ${filtered.length} Pools`
            : "Showing 0 Pools"}
        </span>
        <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
        <PaginationControls page={currentPage} totalPages={totalPages} onPage={setPage} label="Monitoring Results pagination" className="monitor-pagination-controls" />
      </footer>
    </main>
  );
}

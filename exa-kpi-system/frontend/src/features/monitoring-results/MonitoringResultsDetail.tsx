import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import {
  kpiResults,
  monitoringPools,
  type KpiResult,
} from "./monitoring-results.data";
import { MonitoringResultContext } from "./MonitoringResultContext";
import "./monitoring-results.css";

type KpiSortKey = keyof KpiResult;
type ErrorSortKey = keyof ErrorRow;
type Option = { value: string; label: string };
type ErrorRow = {
  row: number;
  code: string;
  field: string;
  error: string;
  currentValue: string;
  expected: string;
};
type PreviewMode = "ENTRY" | "VALIDATION" | "SCORE" | "TRAFFIC_LIGHT";
type PreviewTone = "success" | "warning" | "danger" | "neutral";
type PreviewBarItem = {
  key: string;
  label: string;
  value: number;
  percentage: number;
  valueLabel?: string;
  tone: PreviewTone;
};
type PreviewSummaryItem = { label: string; value: string };

const KPI_PAGE_SIZE = 5;
const ERROR_PAGE_SIZE = 1;
const errorRows: ErrorRow[] = [
  {
    row: 5,
    code: "KPI-054",
    field: "Result",
    error: "Missing value",
    currentValue: "Empty",
    expected: "Required",
  },
  {
    row: 18,
    code: "KPI-089",
    field: "Result",
    error: "Invalid format",
    currentValue: "po5",
    expected: "Numeric value",
  },
];

function PreviewBars({ items }: { items: PreviewBarItem[] }) {
  return (
    <div
      className="current-preview-bars"
      role="img"
      aria-label={items
        .map((item) => `${item.label}: ${item.valueLabel ?? item.value}`)
        .join(", ")}
    >
      {items.map((item) => (
        <div className="current-preview-bar" key={item.key}>
          <div>
            <span>{item.label}</span>
            <strong>{item.valueLabel ?? item.value}</strong>
          </div>
          <span className="current-preview-track">
            <i
              className={item.tone}
              style={{
                width: `${Math.max(0, Math.min(100, item.percentage))}%`,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function DetailMultiSelect({
  placeholder,
  options,
  selected,
  onChange,
}: {
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selectedOptions = selected.map(
    (value) =>
      options.find((option) => option.value === value) ?? {
        value,
        label: value,
      },
  );
  const visibleCount = useMultiSelectVisibleCount(
    root,
    selectedOptions.map((option) => option.label),
  );
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
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
    <div
      className="result-detail-filter attached-department-multiselect"
      ref={root}
    >
      <button
        type="button"
        className={open ? "open" : ""}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {!selected.length ? (
          <span className="attached-department-placeholder">{placeholder}</span>
        ) : (
          <span className="attached-department-chips">
            {visibleOptions.map((option) => (
              <span className="attached-department-chip" key={option.value}>
                {option.label}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.value);
                  }}
                >
                  <X size={11} />
                </span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="attached-department-chip more">
                +{hiddenCount} More
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Remove additional selections"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(visibleOptions.map((option) => option.value));
                  }}
                >
                  <X size={11} />
                </span>
              </span>
            )}
          </span>
        )}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="attached-department-options">
          <button
            type="button"
            className={!selected.length ? "selected" : ""}
            onClick={() => onChange([])}
          >
            <i>{!selected.length && <Check size={12} />}</i>All
          </button>
          {options.map((option) => (
            <button
              type="button"
              className={selected.includes(option.value) ? "selected" : ""}
              key={option.value}
              onClick={() => toggle(option.value)}
            >
              <i>{selected.includes(option.value) && <Check size={12} />}</i>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  return (
    <footer className="detail-table-pagination">
      <span>
        Showing {start}–{Math.min(page * pageSize, total)} of {total} records
      </span>
      <div>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <strong aria-label={`Page ${page} of ${pages}`}>{page}</strong>
        <button
          type="button"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
}

export function MonitoringResultsDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pool = monitoringPools.find(
    (item) => item.id === (Number(searchParams.get("poolId")) || 0),
  );
  const [period, setPeriod] = useState(
    () => searchParams.get("period") ?? "Jun 2026",
  );
  const [search, setSearch] = useState("");
  const [entryStatuses, setEntryStatuses] = useState<string[]>([]);
  const [validations, setValidations] = useState<string[]>([]);
  const [trafficLights, setTrafficLights] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("ENTRY");
  const [kpiPage, setKpiPage] = useState(1);
  const [errorPage, setErrorPage] = useState(1);
  const [kpiSort, setKpiSort] = useState<{
    key: KpiSortKey;
    direction: SortDirection;
  }>({ key: "code", direction: "asc" });
  const [errorSort, setErrorSort] = useState<{
    key: ErrorSortKey;
    direction: SortDirection;
  }>({ key: "row", direction: "asc" });

  const rows = useMemo(
    () =>
      kpiResults
        .filter(
          (kpi) =>
            (!search ||
              `${kpi.code} ${kpi.name}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (!entryStatuses.length ||
              entryStatuses.includes(kpi.entryStatus)) &&
            (!validations.length || validations.includes(kpi.validation)) &&
            (!trafficLights.length ||
              trafficLights.includes(kpi.trafficLight)) &&
            (!units.length || units.includes(kpi.unit)),
        )
        .sort((a, b) =>
          compareSortValues(
            a[kpiSort.key] ?? "",
            b[kpiSort.key] ?? "",
            kpiSort.direction,
          ),
        ),
    [search, entryStatuses, validations, trafficLights, units, kpiSort],
  );
  const sortedErrors = useMemo(
    () =>
      [...errorRows].sort((a, b) =>
        compareSortValues(
          a[errorSort.key],
          b[errorSort.key],
          errorSort.direction,
        ),
      ),
    [errorSort],
  );
  const paginatedRows = rows.slice(
    (kpiPage - 1) * KPI_PAGE_SIZE,
    kpiPage * KPI_PAGE_SIZE,
  );
  const paginatedErrors = sortedErrors.slice(
    (errorPage - 1) * ERROR_PAGE_SIZE,
    errorPage * ERROR_PAGE_SIZE,
  );
  const totalKpis = kpiResults.length;
  const enteredResults = kpiResults.filter(
    (kpi) => kpi.entryStatus === "Entered",
  ).length;
  const pendingResults = totalKpis - enteredResults;
  const completion = totalKpis ? (enteredResults / totalKpis) * 100 : 0;
  const validResults = kpiResults.filter(
    (kpi) => kpi.validation === "Valid",
  ).length;
  const warningResults = kpiResults.filter(
    (kpi) => kpi.validation === "Warning",
  ).length;
  const missingResults = kpiResults.filter(
    (kpi) => kpi.validation === "Missing",
  ).length;
  const validationProgress = totalKpis ? (validResults / totalKpis) * 100 : 0;
  const scoredResults = kpiResults.flatMap((kpi) =>
    kpi.score === null ? [] : [kpi.score],
  );
  const currentScore = Math.min(
    100,
    scoredResults.length
      ? scoredResults.reduce((sum, score) => sum + score, 0) /
          scoredResults.length
      : 0,
  );
  const greenKpis = kpiResults.filter(
    (kpi) => kpi.trafficLight === "Excellent",
  ).length;
  const yellowKpis = kpiResults.filter(
    (kpi) => kpi.trafficLight === "Warning",
  ).length;
  const redKpis = kpiResults.filter(
    (kpi) => kpi.trafficLight === "Caution",
  ).length;
  let previewTitle = "Result Entry Preview";
  let previewBars: PreviewBarItem[] = [
    {
      key: "entered",
      label: "Entered",
      value: enteredResults,
      percentage: totalKpis ? (enteredResults / totalKpis) * 100 : 0,
      tone: "success",
    },
    {
      key: "pending",
      label: "Pending",
      value: pendingResults,
      percentage: totalKpis ? (pendingResults / totalKpis) * 100 : 0,
      tone: "neutral",
    },
  ];
  let previewSummary: PreviewSummaryItem[] = [
    { label: "Results entered", value: String(enteredResults) },
    { label: "Results pending", value: String(pendingResults) },
    { label: "Total KPI lines", value: String(totalKpis) },
    { label: "Completion", value: `${completion.toFixed(0)}%` },
  ];
  if (previewMode === "VALIDATION") {
    previewTitle = "Validation Preview";
    previewBars = [
      {
        key: "valid",
        label: "Valid",
        value: validResults,
        percentage: totalKpis ? (validResults / totalKpis) * 100 : 0,
        tone: "success",
      },
      {
        key: "warning",
        label: "Warning",
        value: warningResults,
        percentage: totalKpis ? (warningResults / totalKpis) * 100 : 0,
        tone: "warning",
      },
      {
        key: "missing",
        label: "Missing",
        value: missingResults,
        percentage: totalKpis ? (missingResults / totalKpis) * 100 : 0,
        tone: "danger",
      },
    ];
    previewSummary = [
      { label: "Validated results", value: String(validResults) },
      {
        label: "Results to review",
        value: String(warningResults + missingResults),
      },
      {
        label: "Validation progress",
        value: `${validationProgress.toFixed(0)}%`,
      },
    ];
  } else if (previewMode === "SCORE") {
    previewTitle = "Current Score Preview";
    previewBars = [
      {
        key: "score",
        label: "Current Score",
        value: currentScore,
        valueLabel: `${currentScore.toFixed(2)}%`,
        percentage: currentScore,
        tone: "success",
      },
    ];
    previewSummary = [
      { label: "Current score", value: `${currentScore.toFixed(2)}%` },
      { label: "Maximum score", value: "100.00%" },
      {
        label: "Remaining",
        value: `${Math.max(0, 100 - currentScore).toFixed(2)}%`,
      },
    ];
  } else if (previewMode === "TRAFFIC_LIGHT") {
    previewTitle = "Current Traffic Light Preview";
    previewBars = [
      {
        key: "green",
        label: "Green",
        value: greenKpis,
        percentage: totalKpis ? (greenKpis / totalKpis) * 100 : 0,
        tone: "success",
      },
      {
        key: "yellow",
        label: "Yellow",
        value: yellowKpis,
        percentage: totalKpis ? (yellowKpis / totalKpis) * 100 : 0,
        tone: "warning",
      },
      {
        key: "red",
        label: "Red",
        value: redKpis,
        percentage: totalKpis ? (redKpis / totalKpis) * 100 : 0,
        tone: "danger",
      },
    ];
    previewSummary = [
      { label: "Green KPIs", value: String(greenKpis) },
      { label: "Yellow KPIs", value: String(yellowKpis) },
      { label: "Red KPIs", value: String(redKpis) },
      { label: "Total KPIs", value: String(totalKpis) },
    ];
  }
  useEffect(
    () => setKpiPage(1),
    [search, entryStatuses, validations, trafficLights, units, period],
  );

  if (!pool)
    return (
      <main className="monitor-page">
        <nav className="kpi-breadcrumb">
          <Link to="/app/monitoring-results">Monitoring Results</Link>
          <span>/</span>
          <span>Monitoring Results Detail</span>
        </nav>
        <section className="monitor-empty-state">
          <h1>No KPI Pool selected</h1>
          <p>Open a Pool from Monitoring Overview to review its results.</p>
          <button
            className="monitor-back"
            onClick={() => navigate("/app/monitoring-results/overview")}
          >
            <ArrowLeft size={16} />
            Back to Overview
          </button>
        </section>
      </main>
    );

  const changeKpiSort = (key: KpiSortKey) => {
    setKpiSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setKpiPage(1);
  };
  const changeErrorSort = (key: ErrorSortKey) => {
    setErrorSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setErrorPage(1);
  };
  const kpiHeader = (key: KpiSortKey, label: string) => (
    <SortableTableHeader
      active={kpiSort.key === key}
      direction={kpiSort.direction}
      onSort={() => changeKpiSort(key)}
    >
      {label}
    </SortableTableHeader>
  );
  const errorHeader = (key: ErrorSortKey, label: string) => (
    <SortableTableHeader
      active={errorSort.key === key}
      direction={errorSort.direction}
      onSort={() => changeErrorSort(key)}
    >
      {label}
    </SortableTableHeader>
  );
  const values = (items: string[]): Option[] =>
    [...new Set(items)].map((value) => ({ value, label: value }));
  const currentResultsPreview = (
    <section className="current-results-preview">
      <header>
        <div>
          <span>Current Results Preview</span>
          <small>
            Complete selected-period context; table filters do not affect this
            preview.
          </small>
        </div>
        <label>
          <span>Preview</span>
          <select
            aria-label="Select current results preview"
            value={previewMode}
            onChange={(event) =>
              setPreviewMode(event.target.value as PreviewMode)
            }
          >
            <option value="ENTRY">Result Entry Preview</option>
            <option value="VALIDATION">Validation Preview</option>
            <option value="SCORE">Current Score Preview</option>
            <option value="TRAFFIC_LIGHT">Current Traffic Light Preview</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </header>
      <div className="current-preview-content">
        <div>
          <h3>{previewTitle}</h3>
          <PreviewBars items={previewBars} />
        </div>
        <dl>
          {previewSummary.map((item, index) => (
            <div
              className={index === previewSummary.length - 1 ? "total" : ""}
              key={item.label}
            >
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
  const missingIssueCount = errorRows.filter((item) =>
    item.error.toLowerCase().includes("missing"),
  ).length;
  const formatIssueCount = errorRows.filter((item) =>
    item.error.toLowerCase().includes("format"),
  ).length;
  const hasValidationIssues =
    errorRows.length > 0 || warningResults > 0 || missingResults > 0;

  return (
    <main className="monitor-page monitor-detail-page">
      <nav className="kpi-breadcrumb">
        <Link to="/app/monitoring-results">Monitoring Results</Link>
        <span>/</span>
        <Link to="/app/monitoring-results/overview">Monitoring Overview</Link>
        <span>/</span>
        <span>Monitoring Results Detail</span>
      </nav>
      <header className="monitor-header schedule-header">
        <div>
          <span className="monitor-eyebrow">PERIOD RESULTS</span>
          <h1>Monitoring Results Detail</h1>
          <p>
            Review the KPI list, performance and validation findings for the
            selected Pool period.
          </p>
        </div>
      </header>
      <MonitoringResultContext
        pool={pool}
        period={period}
        onPeriodChange={setPeriod}
      />
      <div className="result-detail-content-grid">
        <section className="result-detail-card result-context-section">
          <div className="result-detail-section-heading">
            <h2>Pool Result Context</h2>
            <span>Pool identity</span>
          </div>
          <dl className="result-definition-data">
            <div>
              <dt>Pool Code</dt>
              <dd>{pool.code}</dd>
            </div>
            <div>
              <dt>Pool Name</dt>
              <dd>{pool.name}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{pool.companies.join(", ")}</dd>
            </div>
            <div>
              <dt>Pool Duration</dt>
              <dd>{pool.duration}</dd>
            </div>
            <div>
              <dt>Input Frequency</dt>
              <dd>{pool.frequency}</dd>
            </div>
            <div>
              <dt>KPI Lines</dt>
              <dd>{pool.kpiLines}</dd>
            </div>
          </dl>
        </section>
        <aside className="result-detail-card input-period-summary">
          <div className="result-detail-section-heading">
            <h2>Input Period Summary</h2>
            <span>Period snapshot</span>
          </div>
          <dl className="result-definition-data result-period-data">
            <div>
              <dt>Results Entered</dt>
              <dd className="summary-positive">
                {enteredResults}/{totalKpis}
              </dd>
            </div>
            <div>
              <dt>Missing Results</dt>
              <dd className="summary-warning">{pendingResults}</dd>
            </div>
            <div className="full">
              <dt>Uploaded File</dt>
              <dd>results_jun_2026.xlsx</dd>
            </div>
            <div>
              <dt>Uploaded By</dt>
              <dd>Carlos Gomez</dd>
            </div>
            <div>
              <dt>Uploaded At</dt>
              <dd>30/06/2026 · 14:35</dd>
            </div>
            <div>
              <dt>Validation Status</dt>
              <dd>
                <span className="schedule-badge validation-with-warnings">
                  {warningResults || missingResults
                    ? "With Warnings"
                    : "No Errors"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Entry Status</dt>
              <dd>
                <span
                  className={`schedule-badge entry-${pool.status.toLowerCase().replace(/_/g, "-")}`}
                >
                  {pool.status
                    .toLowerCase()
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </span>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
      {currentResultsPreview}
      <section className="result-table-section">
        <header>
          <div>
            <h2>
              KPI Results Table <span>{period}</span>
            </h2>
            <p>
              {rows.length} visible KPI lines · interpreted results remain
              available when raw values are restricted.
            </p>
          </div>
          <div className="result-export-actions">
            <button onClick={() => setShowRaw((value) => !value)}>
              {showRaw ? <EyeOff size={15} /> : <Eye size={15} />}
              {showRaw ? "Hide Raw Results" : "View Raw Results"}
            </button>
            <button className="xls">
              <Download size={15} />
              Export XLS
            </button>
            <button className="pdf">
              <FileText size={15} />
              Export PDF
            </button>
          </div>
        </header>
        {!showRaw && (
          <div className="restricted-note">
            <EyeOff size={15} />
            <span>
              Raw Result and Data Source are hidden by default. Compliance Rate,
              Score and status information remain visible.
            </span>
          </div>
        )}
        <div className="result-toolbar">
          <div className="result-search-row">
            <div className="monitor-filter-actions result-detail-filter-actions">
              <button
                type="button"
                disabled={
                  !entryStatuses.length &&
                  !validations.length &&
                  !trafficLights.length &&
                  !units.length
                }
                onClick={() => {
                  setEntryStatuses([]);
                  setValidations([]);
                  setTrafficLights([]);
                  setUnits([]);
                  setKpiPage(1);
                }}
              >
                <X size={15} />
                Clear Filters
              </button>
            </div>
            <div className="result-search-control">
              <span>Search</span>
              <label className="result-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search KPI code or name..."
                />
              </label>
            </div>
          </div>
          <DetailMultiSelect
            placeholder="Entry Status"
            options={values(kpiResults.map((item) => item.entryStatus))}
            selected={entryStatuses}
            onChange={setEntryStatuses}
          />
          <DetailMultiSelect
            placeholder="Validation"
            options={values(kpiResults.map((item) => item.validation))}
            selected={validations}
            onChange={setValidations}
          />
          <DetailMultiSelect
            placeholder="Traffic Light"
            options={values(kpiResults.map((item) => item.trafficLight))}
            selected={trafficLights}
            onChange={setTrafficLights}
          />
          <DetailMultiSelect
            placeholder="Unit"
            options={values(kpiResults.map((item) => item.unit))}
            selected={units}
            onChange={setUnits}
          />
        </div>
        <div className="schedule-table-wrap">
          <table className="result-table">
            <thead>
              <tr>
                {kpiHeader("code", "KPI Code")}
                {kpiHeader("name", "KPI Name")}
                {kpiHeader("unit", "Unit")}
                {showRaw && (
                  <>
                    {kpiHeader("dataSource", "Data Source")}
                    {kpiHeader("result", "Raw Result")}
                  </>
                )}
                {kpiHeader("goal", "Goal")}
                {kpiHeader("compliance", "Compliance")}
                {kpiHeader("score", "Score")}
                {kpiHeader("method", "Entry Method")}
                {kpiHeader("entryStatus", "Entry Status")}
                {kpiHeader("validation", "Validation")}
                {kpiHeader("trafficLight", "Traffic Light")}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((kpi) => (
                <tr key={kpi.code}>
                  <td>
                    <strong>{kpi.code}</strong>
                  </td>
                  <td>{kpi.name}</td>
                  <td>{kpi.unit}</td>
                  {showRaw && (
                    <>
                      <td>{kpi.dataSource}</td>
                      <td>{kpi.result}</td>
                    </>
                  )}
                  <td>{kpi.goal}</td>
                  <td>
                    {kpi.compliance === null ? "—" : `${kpi.compliance}%`}
                  </td>
                  <td>{kpi.score === null ? "—" : `${kpi.score}%`}</td>
                  <td>{kpi.method}</td>
                  <td>
                    <span
                      className={`detail-badge entry-${kpi.entryStatus.toLowerCase()}`}
                    >
                      {kpi.entryStatus}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`detail-badge validation-${kpi.validation.toLowerCase()}`}
                    >
                      {kpi.validation}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`detail-badge traffic-${kpi.trafficLight.toLowerCase()}`}
                    >
                      <i />
                      {kpi.trafficLight}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={kpiPage}
          pageSize={KPI_PAGE_SIZE}
          total={rows.length}
          onChange={setKpiPage}
        />
      </section>
      {hasValidationIssues && (
        <section className="error-detail-section validation-issues-section">
          <header>
            <TriangleAlert size={18} />
            <div>
              <h2>Validation Issues</h2>
              <p>
                Missing results, format errors and warnings detected during
                validation.
              </p>
            </div>
            <aside>
              <span>
                Missing Results <strong>{missingIssueCount}</strong>
              </span>
              <span>
                Format Errors <strong>{formatIssueCount}</strong>
              </span>
              <span>
                Warnings <strong>{warningResults}</strong>
              </span>
            </aside>
          </header>
          <div className="schedule-table-wrap">
            <table>
              <thead>
                <tr>
                  {errorHeader("row", "Row")}
                  {errorHeader("code", "KPI Code")}
                  {errorHeader("field", "Field")}
                  {errorHeader("error", "Error")}
                  {errorHeader("currentValue", "Current Value")}
                  {errorHeader("expected", "Expected")}
                </tr>
              </thead>
              <tbody>
                {paginatedErrors.map((item) => (
                  <tr key={item.row}>
                    <td>{item.row}</td>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.field}</td>
                    <td>{item.error}</td>
                    <td>{showRaw ? item.currentValue : "Restricted"}</td>
                    <td>{item.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={errorPage}
            pageSize={ERROR_PAGE_SIZE}
            total={sortedErrors.length}
            onChange={setErrorPage}
          />
        </section>
      )}
      <footer className="monitor-detail-footer">
        <button
          className="monitor-back"
          onClick={() => navigate("/app/monitoring-results/overview")}
        >
          <ArrowLeft size={16} />
          Back to Overview
        </button>
      </footer>
    </main>
  );
}

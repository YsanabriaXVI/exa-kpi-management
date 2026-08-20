import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers3,
  Pencil,
  Search,
  Settings2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import { PoolOverviewMultiSelect } from "./PoolOverviewMultiSelect";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./kpi-pool.css";
import "./period-workflow.css";
import "./pool-detail-period-select.css";

export function KpiPoolDetail() {
  const navigate = useNavigate();
  const { poolId } = useParams();
  const id = Number(poolId) || 0;
  const [kpiSearch, setKpiSearch] = useState("");
  const [kpiCategories, setKpiCategories] = useState<string[]>([]);
  const [kpiDataSources, setKpiDataSources] = useState<string[]>([]);
  const [kpiUnits, setKpiUnits] = useState<string[]>([]);
  const [kpiStatuses, setKpiStatuses] = useState<string[]>([]);
  const [kpiPage, setKpiPage] = useState(1);
  const [kpiPageSize, setKpiPageSize] = useState(10);
  const [kpiSort, setKpiSort] = useState<{ key: "configCode" | "kpiCode" | "name" | "category" | "goal" | "measurementUnit" | "dataSource" | "status"; direction: SortDirection }>({ key: "configCode", direction: "asc" });
  const [scorecardSearch, setScorecardSearch] = useState("");
  const [scorecardCompanies, setScorecardCompanies] = useState<string[]>([]);
  const [scorecardFrequencies, setScorecardFrequencies] = useState<string[]>(
    [],
  );
  const [scorecardStatuses, setScorecardStatuses] = useState<string[]>([]);
  const [scorecardPage, setScorecardPage] = useState(1);
  const [scorecardPageSize, setScorecardPageSize] = useState(10);
  const [scorecardSort, setScorecardSort] = useState<{ key: "code" | "name" | "company" | "duration" | "frequency" | "selectedKpis" | "expectedInputs" | "status"; direction: SortDirection }>({ key: "code", direction: "asc" });
  const [viewingPeriod, setViewingPeriod] = useState("");
  const poolQuery = useQuery({
    queryKey: ["kpi-pool", id],
    queryFn: () => kpiPoolService.get(id),
    enabled: id > 0,
  });
  const pool = poolQuery.data;
  const periodsQuery = useQuery({ queryKey: ["kpi-pool-periods", id], queryFn: () => kpiPoolService.getInputPeriods(id), enabled: id > 0 });
  useEffect(() => { if (!viewingPeriod && periodsQuery.data) setViewingPeriod(periodsQuery.data.meta.defaultPeriodStart ?? periodsQuery.data.data[periodsQuery.data.data.length - 1]?.start ?? ""); }, [periodsQuery.data, viewingPeriod]);
  const selectedPeriod = periodsQuery.data?.data.find((period) => period.start === viewingPeriod);
  const compositionQuery = useQuery({ queryKey: ["kpi-pool-composition", id, viewingPeriod], queryFn: () => kpiPoolService.getComposition(id, viewingPeriod), enabled: id > 0 && Boolean(viewingPeriod) && selectedPeriod?.workflowStatus !== "FUTURE" });
  const compositionKpis = compositionQuery.data ?? [];
  const kpis = useMemo(
    () =>
      compositionKpis.filter(
        (kpi) =>
          (!kpiSearch ||
            `${kpi.kpiCode} ${kpi.name}`
              .toLowerCase()
              .includes(kpiSearch.toLowerCase())) &&
          (!kpiCategories.length || kpiCategories.includes(kpi.category)) &&
          (!kpiDataSources.length || kpiDataSources.includes(kpi.dataSource)) &&
          (!kpiUnits.length || kpiUnits.includes(kpi.measurementUnit)) &&
          (!kpiStatuses.length || kpiStatuses.includes(kpi.status)),
      ).sort((left, right) => compareSortValues(left[kpiSort.key], right[kpiSort.key], kpiSort.direction)),
    [compositionKpis, kpiCategories, kpiDataSources, kpiSearch, kpiSort, kpiStatuses, kpiUnits],
  );
  const scorecards = useMemo(
    () =>
      (pool?.scorecards ?? []).filter(
        (scorecard) =>
          (!scorecardSearch ||
            `${scorecard.code} ${scorecard.name}`
              .toLowerCase()
              .includes(scorecardSearch.toLowerCase())) &&
          (!scorecardCompanies.length ||
            scorecardCompanies.includes(scorecard.company)) &&
          (!scorecardFrequencies.length ||
            scorecardFrequencies.includes(scorecard.frequency)) &&
          (!scorecardStatuses.length ||
            scorecardStatuses.includes(scorecard.status)),
      ).sort((left, right) => compareSortValues(left[scorecardSort.key], right[scorecardSort.key], scorecardSort.direction)),
    [
      pool,
      scorecardCompanies,
      scorecardFrequencies,
      scorecardSearch,
      scorecardSort,
      scorecardStatuses,
    ],
  );
  const sortKpis = (key: typeof kpiSort.key) => setKpiSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const sortScorecards = (key: typeof scorecardSort.key) => setScorecardSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const kpiTotalPages = Math.max(1, Math.ceil(kpis.length / kpiPageSize));
  const scorecardTotalPages = Math.max(
    1,
    Math.ceil(scorecards.length / scorecardPageSize),
  );
  const kpiStart = (kpiPage - 1) * kpiPageSize;
  const scorecardStart = (scorecardPage - 1) * scorecardPageSize;
  const paginatedKpis = kpis.slice(kpiStart, kpiStart + kpiPageSize);
  const paginatedScorecards = scorecards.slice(
    scorecardStart,
    scorecardStart + scorecardPageSize,
  );
  useEffect(
    () => setKpiPage((current) => Math.min(current, kpiTotalPages)),
    [kpiTotalPages],
  );
  useEffect(
    () => setScorecardPage((current) => Math.min(current, scorecardTotalPages)),
    [scorecardTotalPages],
  );
  if (!id)
    return (
      <main className="pool-page">
        <div className="detail-empty-state">
          <h1>No KPI Pool selected</h1>
          <p>Open a KPI Pool from the Overview to view its details.</p>
          <button
            className="button secondary"
            onClick={() => navigate("/app/pool-kpis/overview")}
          >
            Back to Overview
          </button>
        </div>
      </main>
    );
  if (poolQuery.isLoading)
    return (
      <main className="pool-page">
        <div className="pool-loading">Loading KPI Pool...</div>
      </main>
    );
  if (!pool)
    return (
      <main className="pool-page">
        <div className="detail-empty-state">
          <h1>KPI Pool not found</h1>
          <button
            className="button secondary"
            onClick={() => navigate("/app/pool-kpis/overview")}
          >
            Back to Overview
          </button>
        </div>
      </main>
    );

  return (
    <main className="pool-page pool-detail-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/pool-kpis/overview">KPI Pool</Link>
        <span>/</span>
        <Link to={`/app/pool-kpis/detail/${pool.id}`} aria-current="page">
          KPI Pool Detail
        </Link>
      </nav>
      <header className="pool-detail-header">
        <div>
          <h1>{pool.name}</h1>
          <p>{pool.description}</p>
        </div>
        <button
          className="button secondary"
          disabled={pool.status !== "DRAFT"}
          onClick={() =>
            navigate(`/app/pool-kpis/create-pool-info?poolId=${pool.id}`)
          }
        >
          <Pencil size={15} /> Edit Pool Info
        </button>
      </header>

      <section className="pool-summary-card">
        <div className="pool-section-title">
          <span>
            <Layers3 size={19} />
          </span>
          <div>
            <h2>Pool Summary</h2>
            <p>General information and current usage.</p>
          </div>
        </div>
        <dl className="pool-summary-grid">
          <div>
            <dt>Pool Code</dt>
            <dd>{pool.code}</dd>
          </div>
          <div>
            <dt>Companies</dt>
            <dd>
              <Building2 size={15} /> {pool.companies.join(", ")}
            </dd>
          </div>
          <div>
            <dt>KPIs Included</dt>
            <dd className="summary-number">{compositionKpis.length}</dd>
          </div>
          <div>
            <dt>Pool Name</dt>
            <dd>{pool.name}</dd>
          </div>
          <div>
            <dt>Validity</dt>
            <dd>
              <CalendarDays size={15} /> {formatMonth(pool.validFrom)} –{" "}
              {formatMonth(pool.validTo)}
            </dd>
          </div>
          <div>
            <dt>Used in ScoreCards</dt>
            <dd className="summary-number">{pool.scorecards.length}</dd>
          </div>
        </dl>
      </section>

      <section className="pool-detail-section">
        <div className="pool-detail-section-header pool-composition-header">
          <div>
            <div className="pool-table-title">
              <h2>Pool Composition for {viewingPeriod ? formatFullMonth(viewingPeriod) : "Selected Period"}</h2>
              <span>
                {compositionKpis.length} {compositionKpis.length === 1 ? "KPI active" : "KPIs active"} in this period
              </span>
            </div>
            <p>Configurations effective during the selected Input Period.</p>
          </div>
          <div className="pool-detail-period-actions">
            <label><span>View Pool records for</span><div className="pool-period-single-select"><select value={viewingPeriod} onChange={(event) => { setViewingPeriod(event.target.value); setKpiPage(1); }}>{(periodsQuery.data?.data ?? []).map((period) => <option value={period.start} key={period.start}>{formatPeriodOption(period.start)}</option>)}</select><strong className={`pool-period-option-status ${selectedPeriod?.workflowStatus.toLowerCase() ?? "future"}`}>{toTitleCase(selectedPeriod?.workflowStatus ?? "FUTURE")}</strong></div></label>
            <button
              className="button pool-dark-button"
              disabled={pool.status === "INACTIVE" || selectedPeriod?.configurationStatus !== "EDITABLE"}
              onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${pool.id}`)}
            >
              <Settings2 size={15} /> Manage KPIs in Pool
            </button>
          </div>
        </div>
        <div className="pool-detail-filters kpi-detail-filter-grid">
          <label className="pool-search">
            <Search size={16} />
            <input
              value={kpiSearch}
              onChange={(event) => setKpiSearch(event.target.value)}
              placeholder="Search KPI name or code..."
            />
          </label>
          <PoolOverviewMultiSelect
            label="All categories"
            options={[...new Set(compositionKpis.map((kpi) => kpi.category))].map(
              (item) => ({ value: item, label: item }),
            )}
            selected={kpiCategories}
            onChange={setKpiCategories}
          />
          <PoolOverviewMultiSelect
            label="All data sources"
            options={[...new Set(compositionKpis.map((kpi) => kpi.dataSource))].map(
              (item) => ({ value: item, label: item }),
            )}
            selected={kpiDataSources}
            onChange={setKpiDataSources}
          />
          <PoolOverviewMultiSelect
            label="Measurement Unit"
            options={[
              ...new Set(compositionKpis.map((kpi) => kpi.measurementUnit)),
            ].map((item) => ({
              value: item,
              label: formatMeasurementUnit(item),
            }))}
            selected={kpiUnits}
            onChange={setKpiUnits}
          />
          <PoolOverviewMultiSelect
            label="All states"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            selected={kpiStatuses}
            onChange={setKpiStatuses}
          />
        </div>
        <div className="pool-inner-table">
          <table className="kpi-table">
            <thead>
              <tr>
                <SortableTableHeader active={kpiSort.key === "configCode"} direction={kpiSort.direction} onSort={() => sortKpis("configCode")}>Config Code</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "kpiCode"} direction={kpiSort.direction} onSort={() => sortKpis("kpiCode")}>KPI Code</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "name"} direction={kpiSort.direction} onSort={() => sortKpis("name")}>KPI Name</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "category"} direction={kpiSort.direction} onSort={() => sortKpis("category")}>Category</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "goal"} direction={kpiSort.direction} onSort={() => sortKpis("goal")}>Goal</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "measurementUnit"} direction={kpiSort.direction} onSort={() => sortKpis("measurementUnit")}>Measurement Unit</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "dataSource"} direction={kpiSort.direction} onSort={() => sortKpis("dataSource")}>Data Source</SortableTableHeader>
                <SortableTableHeader active={kpiSort.key === "status"} direction={kpiSort.direction} onSort={() => sortKpis("status")}>State</SortableTableHeader>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedKpis.length ? (
                paginatedKpis.map((kpi) => (
                  <tr key={kpi.configCode}>
                    <td>
                      <span className="code-pill">{kpi.configCode}</span>
                    </td>
                    <td>{kpi.kpiCode}</td>
                    <td className="name-cell">{kpi.name}</td>
                    <td>{kpi.category}</td>
                    <td>{kpi.goal}</td>
                    <td>{kpi.measurementUnit}</td>
                    <td>{kpi.dataSource}</td>
                    <td>
                      <span
                        className={`status-chip ${kpi.status.toLowerCase()}`}
                      >
                        <i />
                        {kpi.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button configure"
                          title="Manage KPIs"
                          onClick={() =>
                            navigate(
                              `/app/pool-kpis/manage-kpis?poolId=${pool.id}`,
                            )
                          }
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          className="icon-button view"
                          title="View KPI Configuration detail"
                          onClick={() =>
                            navigate(
                              `/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(kpi.configCode)}&poolId=${pool.id}&from=pool-detail`,
                            )
                          }
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="table-message">
                    No KPI Configurations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <DetailPagination
            start={kpiStart}
            pageSize={kpiPageSize}
            total={kpis.length}
            page={kpiPage}
            totalPages={kpiTotalPages}
            onPage={setKpiPage}
            onPageSize={setKpiPageSize}
            label="KPI Configurations"
          />
        </div>
      </section>

      <section className="pool-detail-section">
        <div className="pool-detail-section-header">
          <div>
            <div className="pool-table-title">
              <h2>ScoreCards Using This Pool</h2>
              <span>
                {pool.scorecards.length}{" "}
                {pool.scorecards.length === 1
                  ? "ScoreCard uses"
                  : "ScoreCards use"}{" "}
                this Pool
              </span>
            </div>
            <p>Read-only usage information from active ScoreCards.</p>
          </div>
        </div>
        <div className="pool-detail-filters scorecard-detail-filter-grid">
          <label className="pool-search">
            <Search size={16} />
            <input
              value={scorecardSearch}
              onChange={(event) => setScorecardSearch(event.target.value)}
              placeholder="Search ScoreCard..."
            />
          </label>
          <PoolOverviewMultiSelect
            label="All companies"
            options={[
              ...new Set(pool.scorecards.map((scorecard) => scorecard.company)),
            ].map((item) => ({ value: item, label: item }))}
            selected={scorecardCompanies}
            onChange={setScorecardCompanies}
          />
          <PoolOverviewMultiSelect
            label="All frequencies"
            options={[
              ...new Set(
                pool.scorecards.map((scorecard) => scorecard.frequency),
              ),
            ].map((item) => ({ value: item, label: item }))}
            selected={scorecardFrequencies}
            onChange={setScorecardFrequencies}
          />
          <PoolOverviewMultiSelect
            label="All states"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            selected={scorecardStatuses}
            onChange={setScorecardStatuses}
          />
        </div>
        <div className="pool-inner-table">
          <table className="kpi-table">
            <thead>
              <tr>
                <SortableTableHeader active={scorecardSort.key === "code"} direction={scorecardSort.direction} onSort={() => sortScorecards("code")}>ScoreCard Code</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "name"} direction={scorecardSort.direction} onSort={() => sortScorecards("name")}>ScoreCard</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "company"} direction={scorecardSort.direction} onSort={() => sortScorecards("company")}>Company</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "duration"} direction={scorecardSort.direction} onSort={() => sortScorecards("duration")}>Duration</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "frequency"} direction={scorecardSort.direction} onSort={() => sortScorecards("frequency")}>Suggested Frequency</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "selectedKpis"} direction={scorecardSort.direction} onSort={() => sortScorecards("selectedKpis")}>Selected KPIs</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "expectedInputs"} direction={scorecardSort.direction} onSort={() => sortScorecards("expectedInputs")}>Expected Inputs</SortableTableHeader>
                <SortableTableHeader active={scorecardSort.key === "status"} direction={scorecardSort.direction} onSort={() => sortScorecards("status")}>State</SortableTableHeader>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedScorecards.length ? (
                paginatedScorecards.map((scorecard) => (
                  <tr key={scorecard.code}>
                    <td>
                      <span className="code-pill">{scorecard.code}</span>
                    </td>
                    <td className="name-cell">{scorecard.name}</td>
                    <td>{scorecard.company}</td>
                    <td>{scorecard.duration}</td>
                    <td>{scorecard.frequency}</td>
                    <td>{scorecard.selectedKpis}</td>
                    <td>{scorecard.expectedInputs}</td>
                    <td>
                      <span
                        className={`status-chip ${scorecard.status.toLowerCase()}`}
                      >
                        <i />
                        {scorecard.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button view"
                        title="View ScoreCard Detail"
                        onClick={() =>
                          navigate(
                            `/app/scorecards/detail?scorecardCode=${encodeURIComponent(scorecard.code)}&poolId=${pool.id}&from=pool-detail`,
                          )
                        }
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="table-message">
                    This Pool is not used by any ScoreCard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <DetailPagination
            start={scorecardStart}
            pageSize={scorecardPageSize}
            total={scorecards.length}
            page={scorecardPage}
            totalPages={scorecardTotalPages}
            onPage={setScorecardPage}
            onPageSize={setScorecardPageSize}
            label="ScoreCards"
          />
        </div>
      </section>
      <footer className="pool-detail-actions">
        <button
          className="button secondary"
          onClick={() => navigate("/app/pool-kpis/overview")}
        >
          <ArrowLeft size={15} /> Back to Overview
        </button>
      </footer>
    </main>
  );
}

function DetailPagination({
  start,
  pageSize,
  total,
  page,
  totalPages,
  onPage,
  onPageSize,
  label,
}: {
  start: number;
  pageSize: number;
  total: number;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
  label: string;
}) {
  return (
    <footer className="pool-detail-pagination">
      <span>
        Showing{" "}
        <strong>
          {total ? start + 1 : 0}-{Math.min(start + pageSize, total)}
        </strong>{" "}
        of <strong>{total}</strong> {label}
      </span>
      <RowsPerPageSelect value={pageSize} onChange={(value) => { onPageSize(value); onPage(1); }} />
      <PaginationControls page={page} totalPages={totalPages} onPage={onPage} label={`${label} pagination`} className="pool-detail-pagination-controls" />
    </footer>
  );
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatFullMonth(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatPeriodOption(value: string) {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date);
  return `${month} ${date.getUTCFullYear()}`;
}

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/(^|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
}

function isDateWithinToday(start: string, end: string) {
  const today = new Date().toISOString().slice(0, 10);
  return start <= today && today <= end;
}

function formatMeasurementUnit(unit: string) {
  const labels: Record<string, string> = {
    "%": "% Percentage",
    Count: "cant Quantity",
    $: "$ Dollar",
    "$/km": "$/km Dollars per kilometer",
    Hours: "h Hours",
    Days: "d Days",
    "km/L": "km/L Kilometers per liter",
  };

  return labels[unit] ?? unit;
}

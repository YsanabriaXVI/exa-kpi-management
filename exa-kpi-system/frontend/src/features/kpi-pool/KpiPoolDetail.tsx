import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Layers3,
  Pencil,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import { PoolOverviewMultiSelect } from "./PoolOverviewMultiSelect";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./kpi-pool.css";
import "./period-workflow.css";
import "./pool-detail-period-select.css";
import { PoolPeriodSelect } from "./PoolPeriodSelect";
import { scorecardService } from "../scorecards/scorecard.service";
import type { PoolKpi } from "./kpi-pool.types";

export function KpiPoolDetail() {
  const navigate = useNavigate();
  const { poolId } = useParams();
  const [searchParams] = useSearchParams();
  const id = Number(poolId) || 0;
  const [kpiSearch, setKpiSearch] = useState("");
  const [kpiCategories, setKpiCategories] = useState<string[]>([]);
  const [kpiDataSources, setKpiDataSources] = useState<string[]>([]);
  const [kpiUnits, setKpiUnits] = useState<string[]>([]);
  const [kpiStatuses, setKpiStatuses] = useState<string[]>([]);
  const [kpiPage, setKpiPage] = useState(1);
  const [kpiPageSize, setKpiPageSize] = useState(10);
  const [kpiSort, setKpiSort] = useState<{ key: "configCode" | "kpiCode" | "name" | "category" | "goal" | "measurementUnit" | "dataSource" | "status"; direction: SortDirection }>({ key: "configCode", direction: "asc" });
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageSearch, setUsageSearch] = useState("");
  const [viewingPeriod, setViewingPeriod] = useState("");
  const poolQuery = useQuery({
    queryKey: ["kpi-pool", id],
    queryFn: () => kpiPoolService.get(id),
    enabled: id > 0,
  });
  const pool = poolQuery.data;
  const periodsQuery = useQuery({ queryKey: ["kpi-pool-periods", id], queryFn: () => kpiPoolService.getInputPeriods(id), enabled: id > 0 });
  useEffect(() => { if (!viewingPeriod && periodsQuery.data) { const requestedPeriod = searchParams.get("period"); setViewingPeriod(periodsQuery.data.data.some((period) => period.start === requestedPeriod) ? requestedPeriod! : periodsQuery.data.meta.defaultPeriodStart ?? periodsQuery.data.data[periodsQuery.data.data.length - 1]?.start ?? ""); } }, [periodsQuery.data, searchParams, viewingPeriod]);
  const selectedPeriod = periodsQuery.data?.data.find((period) => period.start === viewingPeriod);
  const compositionQuery = useQuery({ queryKey: ["kpi-pool-composition", id, viewingPeriod], queryFn: () => kpiPoolService.getComposition(id, viewingPeriod), enabled: id > 0 && Boolean(viewingPeriod) && selectedPeriod?.workflowStatus !== "FUTURE" });
  const periodKey = viewingPeriod.slice(0, 7);
  const usageQuery = useQuery({ queryKey: ["scorecard-pool-usage", id, periodKey], queryFn: () => scorecardService.poolUsage(id, periodKey), enabled: id > 0 && Boolean(periodKey) && selectedPeriod?.workflowStatus !== "FUTURE", retry: false });
  const compositionKpis = compositionQuery.data ?? [];
  const usage = usageQuery.data;
  const availableCount = compositionKpis.length;
  const assignedCount = Math.min(availableCount, usage?.assignedKpiCount ?? 0);
  const notAssignedCount = Math.max(0, availableCount - assignedCount);
  const scorecardDistribution = useMemo(() => {
    const groups = new Map<string, { scorecardId: string; code: string; name: string; count: number }>();
    for (const assignment of usage?.assignments ?? []) { const current = groups.get(assignment.scorecardId); if (current) current.count += 1; else groups.set(assignment.scorecardId, { scorecardId: assignment.scorecardId, code: assignment.scorecardCode, name: assignment.scorecardName, count: 1 }); }
    return [...groups.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
  }, [usage]);
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
  const sortKpis = (key: typeof kpiSort.key) => setKpiSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const kpiTotalPages = Math.max(1, Math.ceil(kpis.length / kpiPageSize));
  const kpiStart = (kpiPage - 1) * kpiPageSize;
  const paginatedKpis = kpis.slice(kpiStart, kpiStart + kpiPageSize);
  useEffect(
    () => setKpiPage((current) => Math.min(current, kpiTotalPages)),
    [kpiTotalPages],
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
        <div className="pool-detail-header-actions"><button className="button secondary" onClick={() => navigate(`/app/pool-kpis/period-schedule?poolId=${pool.id}`)}><CalendarRange size={15}/> Period Schedule</button><button className="button secondary" disabled={pool.status !== "DRAFT"} onClick={() => navigate(`/app/pool-kpis/create-pool-info?poolId=${pool.id}`)}><Pencil size={15} /> Edit Pool Info</button></div>
      </header>

      <section className="pool-detail-period-context" aria-label="Selected Input Period">
        <label><span>Select Input Period</span><PoolPeriodSelect periods={periodsQuery.data?.data ?? []} value={viewingPeriod} onChange={(period) => { setViewingPeriod(period); setKpiPage(1); setUsageModalOpen(false); }}/></label>
      </section>

      <section className="pool-summary-card">
        <div className="pool-section-title">
          <span>
            <Layers3 size={19} />
          </span>
          <div>
            <h2>Pool Summary</h2>
            <p>Stable Pool information.</p>
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
            <dt>Status</dt>
            <dd><span className={`status-chip ${pool.status.toLowerCase()}`}><i />{titleStatus(pool.status)}</span></dd>
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
            <dt>Input Frequency</dt>
            <dd>{pool.frequency}</dd>
          </div>
        </dl>
      </section>

      <section className="pool-coverage-card" aria-labelledby="pool-coverage-title">
        <header><div><div className="coverage-title-line"><h2 id="pool-coverage-title">Scorecard KPI Allocation — {viewingPeriod ? formatFullMonth(viewingPeriod) : "Selected Period"}</h2><span className="coverage-help" title="Shows how the finalized Pool composition is allocated across Scorecards for the selected Input Period. Percentages represent KPI counts, not Weight."><Info size={16}/></span></div><p>How the finalized Pool composition is allocated across Scorecards.</p></div></header>
        {usageQuery.isError && <p className="coverage-error">Scorecard usage is temporarily unavailable. Composition counts remain period-specific.</p>}
        <div className="coverage-allocation-layout">
          <section className="coverage-allocation" aria-labelledby="kpi-allocation-title"><div className="coverage-panel-heading"><div><span>KPI Allocation</span><h3 id="kpi-allocation-title">{assignedCount} / {availableCount} KPIs assigned</h3></div><span className={`allocation-status ${notAssignedCount === 0 && availableCount > 0 ? "complete" : "partial"}`}>{notAssignedCount === 0 && availableCount > 0 ? "Fully Assigned" : `${notAssignedCount} Unassigned`}</span></div><div className="coverage-scorecard-bar" role="img" aria-label={`${assignedCount} of ${availableCount} Pool KPIs assigned across ${scorecardDistribution.length} Scorecards. Percentages represent KPI count, not Weight.`}>{scorecardDistribution.map((row, index) => <span className={`scorecard-segment segment-${index % 6}`} key={row.scorecardId} style={{ width: `${availableCount ? row.count / availableCount * 100 : 0}%` }} title={`${row.code}: ${row.count} KPI${row.count === 1 ? "" : "s"} · ${formatPercent(availableCount ? row.count / availableCount * 100 : 0)}% of Pool KPIs (not Weight)`}/>)}{notAssignedCount > 0 && <span className="unassigned-segment" style={{ width: `${availableCount ? notAssignedCount / availableCount * 100 : 0}%` }} title={`${notAssignedCount} unassigned KPI${notAssignedCount === 1 ? "" : "s"}`}/>}</div><div className="coverage-distribution">{scorecardDistribution.map((row, index) => <div key={row.scorecardId}><i className={`segment-${index % 6}`}/><span><strong>{row.code} · {row.name}</strong></span><b>{row.count} KPI{row.count === 1 ? "" : "s"} <small>· {formatPercent(availableCount ? row.count / availableCount * 100 : 0)}% of Pool KPIs</small></b></div>)}<div className="unassigned"><i/><span><strong>Unassigned</strong></span><b>{notAssignedCount} KPI{notAssignedCount === 1 ? "" : "s"}</b></div></div></section>
          <aside className="coverage-assignment-summary"><span>Assignment Summary</span><dl><div><dt>Pool Composition</dt><dd>{availableCount} KPIs</dd></div><div><dt>Scorecards Using Pool</dt><dd>{usage?.scorecardsUsingCount ?? 0}</dd></div><div><dt>KPIs Assigned</dt><dd>{assignedCount}</dd></div><div><dt>KPIs Still Available</dt><dd>{notAssignedCount}</dd></div></dl><p className={notAssignedCount === 0 && availableCount > 0 ? "complete" : "pending"}><CheckCircle2 size={15}/>{notAssignedCount === 0 && availableCount > 0 ? "All Pool KPIs are assigned" : `${notAssignedCount} Pool KPI${notAssignedCount === 1 ? " is" : "s are"} still available`}</p><button type="button" className="button secondary" disabled={usageQuery.isLoading || usageQuery.isError} onClick={() => setUsageModalOpen(true)}>View Scorecard Usage</button></aside>
        </div>
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
            <button
              className="button pool-dark-button"
              disabled={pool.status === "INACTIVE" || selectedPeriod?.configurationStatus !== "EDITABLE"}
              onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${pool.id}&period=${encodeURIComponent(viewingPeriod)}`)}
            >
              <Settings2 size={15} /> Manage KPIs in Pool
            </button>
          </div>
        </div>
        {selectedPeriod?.workflowStatus === "FUTURE" ? <div className="future-composition-empty"><CalendarRange size={34}/><span className="selected-period-badge">{formatFullMonth(viewingPeriod)} · Future</span><h2>KPI composition not available yet</h2><p>Complete the previous period workflow before this composition becomes available.</p><strong>Current editable composition: {periodsQuery.data?.meta.defaultPeriodStart ? formatFullMonth(periodsQuery.data.meta.defaultPeriodStart) : "None available"}</strong></div> : <><div className="pool-detail-filters kpi-detail-filter-grid">
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
                          className="icon-button view"
                          title="View KPI Configuration detail"
                          aria-label={`View details for ${kpi.configCode}`}
                          disabled={!kpi.configurationId}
                          onClick={() =>
                            navigate(
                              `/app/kpi-management/config/detail-record?kpiConfigId=${encodeURIComponent(kpi.configurationId!)}&poolId=${pool.id}&from=pool-detail`,
                            )
                          }
                        >
                          <Eye size={14} />
                        </button>
                        {kpi.configurationId && selectedPeriod?.poolPeriodId && usage?.assignments.find((item)=>item.kpiConfigurationId===kpi.configurationId)?.scorecardCompositionStatus !== "FINALIZED" && <button className="icon-button edit" title="Edit effective KPI settings for this Pool period" aria-label={`Edit ${kpi.configCode} for ${selectedPeriod.periodKey}`} onClick={() => navigate(`/app/kpi-management/config/set?mode=POOL_PERIOD_EDIT&kpiConfigId=${encodeURIComponent(kpi.configurationId!)}&poolId=${pool.id}&inputPeriodId=${selectedPeriod.poolPeriodId}&period=${selectedPeriod.start}`)}><Pencil size={14}/></button>}
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
        </div></>}
      </section>

      {usageModalOpen && (
        <ScorecardUsageModal
          period={viewingPeriod}
          available={availableCount}
          usage={usage}
          composition={compositionKpis}
          search={usageSearch}
          onSearch={setUsageSearch}
          onClose={() => { setUsageModalOpen(false); setUsageSearch(""); }}
        />
      )}
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

function ScorecardUsageModal({ period, available, usage, composition, search, onSearch, onClose }: { period: string; available: number; usage?: import("../scorecards/scorecard.service").PoolScorecardUsage; composition: PoolKpi[]; search: string; onSearch: (value: string) => void; onClose: () => void }) {
  const [scorecardFilter, setScorecardFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<{ key: "configuration" | "kpi" | "scorecard" | "departments" | "status"; direction: SortDirection }>({ key: "configuration", direction: "asc" });
  const assignments = useMemo(() => new Map((usage?.assignments ?? []).map((row) => [row.kpiConfigurationId, row])), [usage]);
  const scorecards = useMemo(() => [...new Map((usage?.assignments ?? []).map((row) => [row.scorecardId, { id: row.scorecardId, code: row.scorecardCode, name: row.scorecardName }])).values()].sort((left, right) => left.code.localeCompare(right.code)), [usage]);
  const rows = useMemo(() => composition.map((kpi) => ({ kpi, assignment: kpi.configurationId ? assignments.get(kpi.configurationId) : undefined })).filter(({ kpi, assignment }) => {
    const matchesSearch = `${kpi.configCode} ${kpi.kpiCode} ${kpi.name} ${assignment?.scorecardCode ?? ""} ${assignment?.scorecardName ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesScorecard = scorecardFilter === "ALL" || assignment?.scorecardId === scorecardFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ASSIGNED" ? Boolean(assignment) : !assignment);
    return matchesSearch && matchesScorecard && matchesStatus;
  }), [assignments, composition, scorecardFilter, search, statusFilter]);
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const value = (row: typeof left) => sort.key === "configuration" ? row.kpi.configCode : sort.key === "kpi" ? `${row.kpi.name} ${row.kpi.kpiCode}` : sort.key === "scorecard" ? `${row.assignment?.scorecardCode ?? ""} ${row.assignment?.scorecardName ?? ""}` : sort.key === "departments" ? row.assignment?.departments.join(", ") ?? "" : row.assignment ? "Assigned" : "Unassigned";
    return compareSortValues(value(left), value(right), sort.direction);
  }), [rows, sort]);
  const sortBy = (key: typeof sort.key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  return <div className="pool-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="scorecard-usage-modal" role="dialog" aria-modal="true" aria-labelledby="scorecard-usage-modal-title"><header><div><h2 id="scorecard-usage-modal-title">Scorecard Usage — {formatFullMonth(period)}</h2><p>{usage?.assignedKpiCount ?? 0} of {available} KPI Configurations assigned<br/>{usage?.scorecardsUsingCount ?? 0} Scorecards using this Pool</p></div><button type="button" onClick={onClose} aria-label="Close Scorecard Usage"><X size={18}/></button></header><div className="scorecard-usage-filters"><label className="pool-search"><Search size={16}/><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search KPI or Scorecard..."/></label><label><span>Assigned Scorecard</span><select value={scorecardFilter} onChange={(event) => setScorecardFilter(event.target.value)}><option value="ALL">All Scorecards</option>{scorecards.map((scorecard) => <option key={scorecard.id} value={scorecard.id}>{scorecard.code} · {scorecard.name}</option>)}</select></label><label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All Statuses</option><option value="ASSIGNED">Assigned</option><option value="UNASSIGNED">Unassigned</option></select></label></div><div className="scorecard-usage-table-wrap"><table className="kpi-table"><thead><tr><SortableTableHeader active={sort.key === "configuration"} direction={sort.direction} onSort={() => sortBy("configuration")}>KPI Configuration</SortableTableHeader><SortableTableHeader active={sort.key === "kpi"} direction={sort.direction} onSort={() => sortBy("kpi")}>KPI</SortableTableHeader><SortableTableHeader active={sort.key === "scorecard"} direction={sort.direction} onSort={() => sortBy("scorecard")}>Assigned Scorecard</SortableTableHeader><SortableTableHeader active={sort.key === "departments"} direction={sort.direction} onSort={() => sortBy("departments")}>Departments</SortableTableHeader><SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader></tr></thead><tbody>{sortedRows.length ? sortedRows.map(({ kpi, assignment }) => <tr key={kpi.configurationId ?? kpi.configCode}><td><span className="code-pill">{kpi.configCode}</span></td><td><strong>{kpi.name}</strong><small>{kpi.kpiCode}</small></td><td>{assignment ? <><strong>{assignment.scorecardCode}</strong><small>{assignment.scorecardName}</small></> : "—"}</td><td>{assignment?.departments.join(", ") || "—"}</td><td><span className={assignment ? "usage-assigned-badge" : "usage-unassigned-badge"}>{assignment ? "Assigned" : "Unassigned"}</span></td></tr>) : <tr><td colSpan={5} className="table-message">No KPI Configurations match the selected filters.</td></tr>}</tbody></table></div><footer><button type="button" className="button secondary" onClick={onClose}>Close</button></footer></section></div>;
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
function formatPercent(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2); }
function titleStatus(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }

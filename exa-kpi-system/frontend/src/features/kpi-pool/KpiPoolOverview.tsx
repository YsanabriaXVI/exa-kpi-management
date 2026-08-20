import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import { PoolOverviewMultiSelect } from "./PoolOverviewMultiSelect";
import { SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { OverviewDeleteConfirmation } from "../../components/OverviewDeleteConfirmation";
import "./kpi-pool.css";

export function KpiPoolOverview() {
  const [hiddenPoolIds, setHiddenPoolIds] = useState<Set<number>>(() => {
    try { return new Set<number>(JSON.parse(window.localStorage.getItem("exa:kpi-pools:hidden-overview") ?? "[]")); }
    catch { return new Set<number>(); }
  });
  const [poolToHide, setPoolToHide] = useState<{ id: number; code: string } | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [companiesSelected, setCompaniesSelected] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [frequenciesSelected, setFrequenciesSelected] = useState<string[]>([]);
  const [yearsSelected, setYearsSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: PoolSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const lookupsQuery = useQuery({ queryKey: ["kpi-pool-lookups"], queryFn: kpiPoolService.lookups });
  const apiSortBy: Record<PoolSortKey, string> = { code: "poolCode", name: "poolName", companies: "poolCode", frequency: "inputFrequencyCode", validity: "validFrom", kpis: "poolCode", scorecards: "poolCode", status: "statusCode" };
  const listParams = { page, pageSize, ...(search.trim() ? { search: search.trim() } : {}), ...(companiesSelected.length ? { companyId: companiesSelected } : {}), ...(statuses.length ? { status: statuses } : {}), ...(frequenciesSelected.length ? { inputFrequencyId: frequenciesSelected } : {}), ...(yearsSelected.length ? { issueYear: yearsSelected } : {}), sortBy: apiSortBy[sort.key], sortOrder: sort.direction } as const;
  const poolsQuery = useQuery({ queryKey: ["kpi-pools", "list", listParams], queryFn: () => kpiPoolService.listPage(listParams) });
  const paginated = poolsQuery.data?.data ?? [];
  const visiblePools = paginated.filter((pool) => !hiddenPoolIds.has(pool.id));
  const totalItems = Math.max(0, (poolsQuery.data?.meta.totalItems ?? 0) - hiddenPoolIds.size);
  const totalPages = Math.max(1, poolsQuery.data?.meta.totalPages ?? 1);
  const pageStart = (page - 1) * pageSize;
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1].map(String);
  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);
  useEffect(() => setPage(1), [companiesSelected, frequenciesSelected, search, statuses, yearsSelected]);
  const sortBy = (key: PoolSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };
  const hidePool = (id: number) => {
    setHiddenPoolIds((current) => {
      const next = new Set(current); next.add(id);
      window.localStorage.setItem("exa:kpi-pools:hidden-overview", JSON.stringify([...next]));
      return next;
    });
    if (visiblePools.length === 1 && page > 1) setPage(page - 1);
    setPoolToHide(null);
  };

  return (
    <main className="pool-page pool-overview-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/pool-kpis">KPI Pool</Link><span>/</span>
        <Link to="/app/pool-kpis/overview" aria-current="page">KPI Pool Overview</Link>
      </nav>
      <header className="pool-page-header">
        <div><h1>KPI Pool Overview</h1><p>Build reusable groups of configured KPIs for later assignment to ScoreCards.</p></div>
        <button className="button primary" onClick={() => navigate("/app/pool-kpis/create-pool-info")}><Plus size={16} /> New KPI Pool</button>
      </header>

      <section className="pool-toolbar">
        <label className="pool-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Pool code or name..." /></label>
        <PoolOverviewMultiSelect label="All companies" options={(lookupsQuery.data?.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} selected={companiesSelected} onChange={setCompaniesSelected} />
        <PoolOverviewMultiSelect label="All statuses" options={[{ value: "DRAFT", label: "Draft" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} selected={statuses} onChange={setStatuses} />
        <PoolOverviewMultiSelect label="All frequencies" options={(lookupsQuery.data?.inputFrequencies ?? []).map((item) => ({ value: item.id, label: item.name }))} selected={frequenciesSelected} onChange={setFrequenciesSelected} />
        <PoolOverviewMultiSelect label="All years" options={years.map((item) => ({ value: item, label: item }))} selected={yearsSelected} onChange={setYearsSelected} />
      </section>

      <div className="kpi-table-wrap pool-table-wrap stable-table-shell">
        <table className="kpi-table pool-table">
          <thead><tr>
            <SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>Pool Code</SortableTableHeader>
            <SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>Pool Name</SortableTableHeader>
            <SortableTableHeader active={sort.key === "companies"} direction={sort.direction} onSort={() => sortBy("companies")}>Companies</SortableTableHeader>
            <SortableTableHeader active={sort.key === "frequency"} direction={sort.direction} onSort={() => sortBy("frequency")}><>Suggested<br />Frequency</></SortableTableHeader>
            <SortableTableHeader active={sort.key === "validity"} direction={sort.direction} onSort={() => sortBy("validity")}>Validity Period</SortableTableHeader>
            <SortableTableHeader active={sort.key === "kpis"} direction={sort.direction} onSort={() => sortBy("kpis")}>KPIs Included</SortableTableHeader>
            <SortableTableHeader active={sort.key === "scorecards"} direction={sort.direction} onSort={() => sortBy("scorecards")}>Used in ScoreCards</SortableTableHeader>
            <SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader>
            <th className="actions-heading">Actions</th>
          </tr></thead>
          <tbody>{poolsQuery.isLoading ? <tr><td colSpan={9} className="table-message">Loading KPI Pools...</td></tr> : visiblePools.length ? visiblePools.map((pool) => (
            <tr key={pool.id}>
              <td><span className="code-pill">{pool.code}</span></td>
              <td className="name-cell">{pool.name}</td>
              <td>{pool.companies.join(", ")}</td>
              <td>{pool.frequency}</td>
              <td>{formatDate(pool.validFrom)} – {formatDate(pool.validTo)}</td>
              <td className="pool-number">{pool.kpiCount ?? pool.kpis.length}</td>
              <td className="pool-number">{pool.scorecardCount ?? pool.scorecards.length}</td>
              <td><span className={`status-chip ${pool.status.toLowerCase()}`}><i />{pool.status.charAt(0) + pool.status.slice(1).toLowerCase()}</span></td>
              <td><div className="table-actions">
                <button className="icon-button edit" title="Edit Pool Info" onClick={() => navigate(`/app/pool-kpis/create-pool-info?poolId=${pool.id}`)}><Pencil size={15} /></button>
                <button className="icon-button view" title="View Pool Detail" onClick={() => navigate(`/app/pool-kpis/detail/${pool.id}`)}><Eye size={15} /></button>
                <button className="icon-button configure" title="Manage KPIs" onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${pool.id}&source=overview`)}><Settings2 size={15} /></button>
                <button className="icon-button delete" title="Hide Pool from this Overview" aria-label={`Hide ${pool.code} from Overview`} onClick={() => setPoolToHide({ id: pool.id, code: pool.code })}><Trash2 size={15} /></button>
              </div></td>
            </tr>
          )) : <tr><td colSpan={9} className="table-message">No KPI Pools match the selected filters.</td></tr>}</tbody>
        </table>
        <footer className="pool-results">
          <span>Showing <strong>{totalItems ? pageStart + 1 : 0}-{Math.min(pageStart + visiblePools.length, totalItems)}</strong> of <strong>{totalItems}</strong> pools</span>
          <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="KPI Pool pagination" className="pool-pagination" />
        </footer>
      </div>
      {poolToHide && <OverviewDeleteConfirmation title="Remove KPI Pool from Overview?" message={`${poolToHide.code} will be hidden from this Overview only. The Pool and its database history will remain unchanged.`} onAccept={() => hidePool(poolToHide.id)} onCancel={() => setPoolToHide(null)} />}
    </main>
  );
}

type PoolSortKey = "code" | "name" | "companies" | "frequency" | "validity" | "kpis" | "scorecards" | "status";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

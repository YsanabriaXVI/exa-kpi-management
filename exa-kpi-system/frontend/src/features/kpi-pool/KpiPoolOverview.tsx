import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import { PoolOverviewMultiSelect } from "./PoolOverviewMultiSelect";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import type { KpiPoolRecord } from "./kpi-pool.types";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import "./kpi-pool.css";

export function KpiPoolOverview() {
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [companiesSelected, setCompaniesSelected] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [frequenciesSelected, setFrequenciesSelected] = useState<string[]>([]);
  const [yearsSelected, setYearsSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: PoolSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const poolsQuery = useQuery({ queryKey: ["kpi-pools"], queryFn: kpiPoolService.list });
  const deactivate = useMutation({
    mutationFn: kpiPoolService.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kpi-pools"] }),
  });
  const pools = poolsQuery.data ?? [];
  const companies = [...new Set(pools.flatMap((pool) => pool.companies))].sort();
  const frequencies = [...new Set(pools.map((pool) => pool.frequency))].sort();
  const years = [...new Set(pools.map((pool) => pool.validFrom.slice(0, 4)))].sort();
  const filtered = useMemo(() => pools.filter((pool) => {
    const term = search.trim().toLowerCase();
    return (!term || `${pool.code} ${pool.name}`.toLowerCase().includes(term))
      && (!companiesSelected.length || pool.companies.some((company) => companiesSelected.includes(company)))
      && (!statuses.length || statuses.includes(pool.status))
      && (!frequenciesSelected.length || frequenciesSelected.includes(pool.frequency))
      && (!yearsSelected.length || yearsSelected.some((year) => pool.validFrom.startsWith(year)));
  }).sort((left, right) => compareSortValues(poolSortValue(left, sort.key), poolSortValue(right, sort.key), sort.direction)), [companiesSelected, frequenciesSelected, pools, search, sort, statuses, yearsSelected]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);
  const sortBy = (key: PoolSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
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
        <PoolOverviewMultiSelect label="All companies" options={companies.map((item) => ({ value: item, label: item }))} selected={companiesSelected} onChange={setCompaniesSelected} />
        <PoolOverviewMultiSelect label="All statuses" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} selected={statuses} onChange={setStatuses} />
        <PoolOverviewMultiSelect label="All frequencies" options={frequencies.map((item) => ({ value: item, label: item }))} selected={frequenciesSelected} onChange={setFrequenciesSelected} />
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
          <tbody>{poolsQuery.isLoading ? <tr><td colSpan={9} className="table-message">Loading KPI Pools...</td></tr> : paginated.length ? paginated.map((pool) => (
            <tr key={pool.id}>
              <td><span className="code-pill">{pool.code}</span></td>
              <td className="name-cell">{pool.name}</td>
              <td>{pool.companies.join(", ")}</td>
              <td>{pool.frequency}</td>
              <td>{formatDate(pool.validFrom)} – {formatDate(pool.validTo)}</td>
              <td className="pool-number">{pool.kpis.length}</td>
              <td className="pool-number">{pool.scorecards.length}</td>
              <td><span className={`status-chip ${pool.status.toLowerCase()}`}><i />{pool.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
              <td><div className="table-actions">
                <button className="icon-button edit" title="Edit Pool Info" onClick={() => navigate(`/app/pool-kpis/create-pool-info?poolId=${pool.id}`)}><Pencil size={15} /></button>
                <button className="icon-button delete" title="Soft delete Pool" aria-label={`Soft delete ${pool.code}`} disabled={pool.status === "INACTIVE"} onClick={() => deactivate.mutate(pool.id)}><Trash2 size={15} /></button>
                <button className="icon-button view" title="View Pool Detail" onClick={() => navigate(`/app/pool-kpis/detail/${pool.id}`)}><Eye size={15} /></button>
                <button className="icon-button configure" title="Manage KPIs" onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${pool.id}&source=overview`)}><Settings2 size={15} /></button>
              </div></td>
            </tr>
          )) : <tr><td colSpan={9} className="table-message">No KPI Pools match the selected filters.</td></tr>}</tbody>
        </table>
        <footer className="pool-results">
          <span>Showing <strong>{filtered.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> pools</span>
          <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="KPI Pool pagination" className="pool-pagination" />
        </footer>
      </div>
    </main>
  );
}

type PoolSortKey = "code" | "name" | "companies" | "frequency" | "validity" | "kpis" | "scorecards" | "status";

function poolSortValue(pool: KpiPoolRecord, key: PoolSortKey) {
  switch (key) {
    case "companies": return pool.companies.join(", ");
    case "validity": return pool.validFrom;
    case "kpis": return pool.kpis.length;
    case "scorecards": return pool.scorecards.length;
    default: return pool[key];
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

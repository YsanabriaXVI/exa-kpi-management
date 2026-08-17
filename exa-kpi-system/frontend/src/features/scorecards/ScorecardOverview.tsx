import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { scorecardService } from "./scorecard.service";
import { ScorecardMultiSelect } from "./ScorecardMultiSelect";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import type { ScorecardRecord } from "./scorecard.types";
import { ActionToast } from "../../components/ActionToast";
import "./scorecards.css";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";

export function ScorecardOverview() {
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [frequencies, setFrequencies] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: ScorecardSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const query = useQuery({ queryKey: ["scorecards"], queryFn: scorecardService.list });
  const [actionMessage, setActionMessage] = useState("");
  const remove = useMutation({ mutationFn: scorecardService.softDelete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scorecards"] }); setActionMessage("ScoreCard removed from the overview. Its historical records were preserved."); } });
  const records = query.data ?? [];
  const options = (values: string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));
  const filtered = useMemo(() => records.filter((item) => {
    const term = search.toLowerCase();
    return (!term || `${item.code} ${item.name} ${item.poolSource}`.toLowerCase().includes(term))
      && (!departments.length || item.departments.some((department) => departments.includes(department)))
      && (!frequencies.length || frequencies.includes(item.inputFrequency))
      && (!statuses.length || statuses.includes(item.status))
      && (!years.length || years.includes(String(item.year)));
  }).sort((left, right) => compareSortValues(scorecardSortValue(left, sort.key), scorecardSortValue(right, sort.key), sort.direction)), [departments, frequencies, records, search, sort, statuses, years]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  const sortBy = (key: ScorecardSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };
  return <main className="scorecard-page scorecard-overview-page">
    {actionMessage && <ActionToast message={actionMessage} tone="info" onClose={() => setActionMessage("")} />}
    <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/scorecards">ScoreCards</Link><span>/</span><Link to="/app/scorecards/overview" aria-current="page">ScoreCard Overview</Link></nav>
    <header className="scorecard-page-header"><div><h1>ScoreCard Overview</h1><p>Configure ScoreCards with their period, scope and set of KPIs.</p></div><button className="button primary" onClick={() => navigate("/app/scorecards/create-scorecard-info")}><Plus size={16} /> New ScoreCard</button></header>
    <section className="scorecard-toolbar">
      <label className="scorecard-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ScoreCard code, name or Pool..." /></label>
      <ScorecardMultiSelect label="Departments" options={options(records.flatMap((item) => item.departments))} selected={departments} onChange={setDepartments} />
      <ScorecardMultiSelect label="Input Frequency" options={options(records.map((item) => item.inputFrequency))} selected={frequencies} onChange={setFrequencies} />
      <ScorecardMultiSelect label="Status" options={options(records.map((item) => item.status)).map((option) => ({ ...option, label: title(option.label) }))} selected={statuses} onChange={setStatuses} />
      <ScorecardMultiSelect label="Year" options={options(records.map((item) => String(item.year)))} selected={years} onChange={setYears} />
    </section>
    <div className="kpi-table-wrap scorecard-table-wrap stable-table-shell"><table className="kpi-table scorecard-table"><thead><tr>
      <SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>ScoreCard Code</SortableTableHeader>
      <SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>ScoreCard Name</SortableTableHeader>
      <SortableTableHeader active={sort.key === "departments"} direction={sort.direction} onSort={() => sortBy("departments")}>Departments</SortableTableHeader>
      <SortableTableHeader active={sort.key === "duration"} direction={sort.direction} onSort={() => sortBy("duration")}>Duration</SortableTableHeader>
      <SortableTableHeader active={sort.key === "inputFrequency"} direction={sort.direction} onSort={() => sortBy("inputFrequency")}><>Input<br />Frequency</></SortableTableHeader>
      <SortableTableHeader active={sort.key === "kpis"} direction={sort.direction} onSort={() => sortBy("kpis")}>KPIs</SortableTableHeader>
      <SortableTableHeader active={sort.key === "linkedScorecards"} direction={sort.direction} onSort={() => sortBy("linkedScorecards")}>Linked SC</SortableTableHeader>
      <SortableTableHeader active={sort.key === "poolSource"} direction={sort.direction} onSort={() => sortBy("poolSource")}><>KPI Pool<br />Source</></SortableTableHeader>
      <SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader>
      <th>Actions</th>
    </tr></thead><tbody>{query.isLoading ? <tr><td colSpan={10} className="table-message">Loading ScoreCards...</td></tr> : paginated.length ? paginated.map((item) => <tr key={item.id}><td><span className="code-pill">{item.code}</span></td><td className="name-cell">{item.name}</td><td>{item.departments.join(", ")}</td><td>{formatDuration(item.durationMonths, item.year)}</td><td>{item.inputFrequency}</td><td className="scorecard-count">{item.kpis}</td><td className="scorecard-count">{item.linkedScorecards}</td><td>{item.poolSource}</td><td><span className={`scorecard-status ${item.status.toLowerCase()}`}><i />{title(item.status)}</span></td><td><div className="table-actions">
      <button className="icon-button edit" title="Edit ScoreCard Info" onClick={() => navigate(`/app/scorecards/create-scorecard-info?scorecardId=${item.id}`)}><Pencil size={15} /></button>
      <button className="icon-button delete" title="Soft delete ScoreCard" disabled={remove.isPending} onClick={() => { if (window.confirm(`Soft delete ${item.code}? It will be removed from this Overview without affecting historical records.`)) remove.mutate(item.id); }}><Trash2 size={15} /></button>
      <button className="icon-button configure" title="Open ScoreCard Assignment" onClick={() => navigate(`/app/scorecards/assignment?scorecardId=${item.id}&selector=1&source=overview`)}><Settings2 size={15} /></button>
      <button className="icon-button view" title="View Detail" onClick={() => navigate(`/app/scorecards/detail?scorecardId=${item.id}`)}><Eye size={15} /></button>
    </div></td></tr>) : <tr><td colSpan={10} className="table-message">No ScoreCards match the selected filters.</td></tr>}</tbody></table>
      <footer className="scorecard-results"><span>Showing <strong>{filtered.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> ScoreCards</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="ScoreCard pagination" className="scorecard-pagination" /></footer>
    </div>
  </main>;
}

type ScorecardSortKey = "code" | "name" | "departments" | "duration" | "inputFrequency" | "kpis" | "linkedScorecards" | "poolSource" | "status";

function scorecardSortValue(scorecard: ScorecardRecord, key: ScorecardSortKey) {
  switch (key) {
    case "departments": return scorecard.departments.join(", ");
    case "duration": return scorecard.year * 12 + (scorecard.durationMonths[0] ?? 0);
    default: return scorecard[key];
  }
}

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDuration(months: number[], year: number) { return months.length ? `${monthNames[months[0]]} – ${monthNames[months[months.length - 1]]} ${year}` : `No period · ${year}`; }
function title(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }

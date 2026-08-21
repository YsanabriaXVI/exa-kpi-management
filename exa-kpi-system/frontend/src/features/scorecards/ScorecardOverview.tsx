import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { scorecardService } from "./scorecard.service";
import { ScorecardMultiSelect } from "./ScorecardMultiSelect";
import {
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
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
  const backendSort = sort.key === "code" ? "scorecardCode" : sort.key === "name" ? "scorecardName" : sort.key === "status" ? "statusCode" : "createdAt";
  const query = useQuery({ queryKey: ["scorecards", { page, pageSize, search, departments, frequencies, statuses, years, backendSort, direction: sort.direction }], queryFn: () => scorecardService.listPage({ page, pageSize, search, department: departments, frequency: frequencies, status: statuses, year: years, sortBy: backendSort, sortOrder: sort.direction }), placeholderData: (previous) => previous });
  const [actionMessage, setActionMessage] = useState("");
  const remove = useMutation({ mutationFn: scorecardService.deactivate, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scorecards"] }); setActionMessage("ScoreCard deactivated. Its historical records were preserved."); } });
  const records = query.data?.data ?? [];
  const options = (values: string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));
  const totalItems = query.data?.meta.totalItems ?? 0;
  const totalPages = Math.max(1, query.data?.meta.totalPages ?? 1);
  const pageStart = (page - 1) * pageSize;
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  useEffect(() => setPage(1), [search, departments, frequencies, statuses, years]);
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
      <th>Departments</th><th>KPI Pool Source</th><th>Pool Schedule</th><th>Current Composition</th><th>KPIs Selected</th><th>Linked SC</th>
      <SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader>
      <th>Actions</th>
    </tr></thead><tbody>{query.isLoading ? <tr><td colSpan={10} className="table-message">Loading ScoreCards...</td></tr> : query.isError ? <tr><td colSpan={10} className="table-message">ScoreCards could not be loaded: {(query.error as Error).message}</td></tr> : records.length ? records.map((item) => <tr key={item.id}><td><span className="code-pill">{item.code}</span></td><td className="name-cell">{item.name}</td><td>{item.departments.join(", ")}</td><td>{item.poolSource}</td><td><PoolScheduleCell schedule={item.poolSchedule}/></td><td><CompositionCell composition={item.currentComposition}/></td><td className="scorecard-count">{item.currentComposition ? item.kpis : "—"}</td><td className="scorecard-count">{item.currentComposition ? item.linkedScorecards : "—"}</td><td><span className={`scorecard-status ${item.status.toLowerCase()}`}><i />{title(item.status)}</span></td><td><div className="table-actions">
      <button className="icon-button edit" title="Edit ScoreCard Info" onClick={() => navigate(`/app/scorecards/create-scorecard-info?scorecardId=${item.id}`)}><Pencil size={15} /></button>
      <button className="icon-button delete" title="Deactivate ScoreCard (history is preserved)" disabled={remove.isPending || item.status === "INACTIVE"} onClick={() => { if (window.confirm(`Deactivate ${item.code}? Historical compositions will remain available.`)) remove.mutate(item.id); }}><Trash2 size={15} /></button>
      <button className="icon-button configure" title="Open ScoreCard Assignment" onClick={() => navigate(`/app/scorecards/assignment?scorecardId=${item.id}&selector=1&source=overview`)}><Settings2 size={15} /></button>
      <button className="icon-button view" title="View Detail" onClick={() => navigate(`/app/scorecards/detail?scorecardId=${item.id}`)}><Eye size={15} /></button>
    </div></td></tr>) : <tr><td colSpan={10} className="table-message">No ScoreCards match the selected filters.</td></tr>}</tbody></table>
      <footer className="scorecard-results"><span>Showing <strong>{totalItems ? pageStart + 1 : 0}-{Math.min(pageStart + records.length, totalItems)}</strong> of <strong>{totalItems}</strong> ScoreCards</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="ScoreCard pagination" className="scorecard-pagination" /></footer>
    </div>
  </main>;
}

type ScorecardSortKey = "code" | "name" | "departments" | "duration" | "inputFrequency" | "kpis" | "linkedScorecards" | "poolSource" | "status";

function title(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }
function PoolScheduleCell({ schedule }: { schedule: import("./scorecard.types").ScorecardRecord["poolSchedule"] }) {
  if (!schedule) return <span className="overview-period-empty">Schedule unavailable</span>;
  return <div className="scorecard-schedule-cell"><strong>{formatScheduleDate(schedule.validFrom)} – {formatScheduleDate(schedule.validTo)}</strong><small>{schedule.frequency} · {schedule.inputPeriods} periods</small></div>;
}
function CompositionCell({ composition }: { composition: import("./scorecard.types").ScorecardRecord["currentComposition"] }) {
  if (!composition) return <span className="overview-period-empty">Not started</span>;
  return <div className="overview-period-cell"><strong>{formatPeriodKey(composition.periodKey)}</strong><span className={`overview-period-status ${composition.status.toLowerCase().replace("_", "-")}`}>{composition.status === "NOT_STARTED" ? "Not Started" : title(composition.status)}</span>{composition.previous && <small>Previous: {formatPeriodKey(composition.previous.periodKey, true)} · Finalized</small>}</div>;
}
function formatScheduleDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)); }
function formatPeriodKey(value: string, short = false) { const [year, month] = value.split("-").map(Number); return new Intl.DateTimeFormat("en", { month: "short", ...(short ? {} : { year: "numeric" }), timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))); }

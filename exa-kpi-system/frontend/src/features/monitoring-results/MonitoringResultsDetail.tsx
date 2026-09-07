import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PaginationControls } from "../../components/PaginationControls";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { SortableTableHeader } from "../../components/SortableTableHeader";
import { monitoringReadService } from "./monitoring-results.service";
import { PoolPeriodExplorer } from "./PoolPeriodExplorer";
import { TrafficLight } from "./TrafficLight";
import { manualResultEntryService } from "./manual-result-entry.service";
import "./monitoring-results.css";

type DetailSortKey = "kpiCode" | "kpiName" | "unit" | "goal" | "result" | "score" | "trafficLight";

export function MonitoringResultsDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("monitoringPeriodId") ?? "";
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState(""), [entryStatus, setEntryStatus] = useState("");
  const [sortBy, setSortBy] = useState<DetailSortKey>("kpiCode");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const query = useQuery({ queryKey: ["monitoring-detail", id, page, pageSize, search, entryStatus, sortBy, sortOrder], queryFn: () => monitoringReadService.detail(id, { page, pageSize, search, entryStatus: entryStatus ? [entryStatus] : [], sortBy, sortOrder }), enabled: Boolean(id), retry: false });
  const period = query.data?.period;
  const evaluation = useQuery({ queryKey: ["monitoring-result-entry", id], queryFn: () => manualResultEntryService.get(id), enabled: !!id, retry: false });
  const changeSort = (key: DetailSortKey) => { setSortOrder((current) => key === sortBy && current === "asc" ? "desc" : "asc"); setSortBy(key); setPage(1); };
  const header = (key: DetailSortKey, label: string) => <SortableTableHeader active={sortBy === key} direction={sortOrder} onSort={() => changeSort(key)}>{label}</SortableTableHeader>;

  return <main className="monitor-page monitor-detail-page">
    <nav className="kpi-breadcrumb"><Link to="/app/monitoring-results/overview">Monitoring Overview</Link><span>/</span><span>Monitoring Detail</span></nav>
    <header className="monitor-header"><div><span className="monitor-eyebrow">MONITORING RESULTS</span><h1>Monitoring Detail</h1><p>Review Results, Scorecard scores and Traffic Lights for the selected period.</p></div></header>
    {!id ? <PoolPeriodExplorer destination="detail"/> : query.isLoading ? <section className="result-entry-live-state"><p>Loading Monitoring Detail…</p></section> : query.isError ? <section className="result-entry-live-state"><p>Monitoring Detail could not be loaded.</p><button onClick={() => query.refetch()}>Retry</button></section> : <>
      <section className="result-entry-live-header"><div><span>{period.code}</span><h1>{period.poolCode} · {period.poolName}</h1><p>{period.periodLabel} · {period.status}</p></div><dl><div><dt>Expected</dt><dd>{period.expected}</dd></div><div><dt>Entered</dt><dd>{period.entered}</dd></div><div><dt>Pending</dt><dd>{period.pending}</dd></div></dl></section>
      <div className="detail-workflow-actions"><Link className="entry-primary" to={"/app/monitoring-results/result-entry?monitoringPeriodId=" + id}>Open Results Wizard</Link><Link to="/app/monitoring-results/detail">Change Pool / Period</Link><Link to={"/app/monitoring-results/pool-input-schedule?poolId=" + period.poolId}>All Pool Periods</Link></div>
      <section className="wizard-scorecards" aria-label="Scorecard scores">{query.data?.scorecards.map((card: any) => <article className="check-scorecard" key={card.id}><strong>{card.name}</strong><p>{period.status === "CLOSED" ? "Final Score" : "Current Score"}: {(period.status === "CLOSED" ? card.finalScore : card.previewScore) == null ? "Unavailable" : Number(period.status === "CLOSED" ? card.finalScore : card.previewScore).toFixed(2) + "%"}</p></article>)}</section>
      {evaluation.data?.check?.findings.length ? <aside className="monitoring-score-blocked"><strong>Check Results: {evaluation.data.check.summary?.blocking ?? 0} blocking findings</strong><p>{evaluation.data.check.findings[0].message}</p><Link to={"/app/monitoring-results/result-entry?monitoringPeriodId=" + id}>Review findings in Results Wizard</Link></aside> : period.currentScoring?.status !== "CURRENT" && <p>Run Check Results in the Results Wizard to calculate current scores and Traffic Lights.</p>}
      <section className="result-entry-live-card"><header><div><h2>KPI Results</h2><p>Scores and Traffic Lights reflect the latest Check Results. Missing or stale calculations are shown as unavailable.</p></div></header>
        <div className="result-toolbar attached-toolbar"><label><Search size={16}/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search KPI or ScoreCard…"/></label><select value={entryStatus} onChange={(event) => { setEntryStatus(event.target.value); setPage(1); }}><option value="">All entry statuses</option><option value="ENTERED">Entered</option><option value="PENDING">Pending</option></select></div>
        <div className="result-entry-live-table-wrap"><table><thead><tr>{header("kpiCode", "KPI Code")}{header("kpiName", "KPI Name")}<th>ScoreCard</th>{header("unit", "Unit")}{header("goal", "Goal")}{header("result", "Result")}<th>Entry</th><th>Validation</th>{header("score", "Score")}{header("trafficLight", "Traffic Light")}</tr></thead><tbody>{query.data?.data.map((row: any) => <tr key={row.id}><td><span>{row.kpiCode}</span></td><td><strong>{row.kpiName}</strong></td><td>{row.scorecardCode}</td><td>{row.unit ?? "—"}</td><td>{row.goal ?? "—"}</td><td>{row.result ?? "—"}</td><td>{row.entryStatus}</td><td>{row.validation}</td><td>{row.score ?? "—"}</td><td><TrafficLight value={row.trafficLight}/></td></tr>)}</tbody></table><footer className="detail-table-pagination"><span>{query.data?.meta.totalItems ?? 0} KPI lines</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }}/><PaginationControls page={page} totalPages={Math.max(1, query.data?.meta.totalPages ?? 1)} onPage={setPage} label="Monitoring Detail pagination"/></footer></div>
      </section></>}
    <button className="monitor-back schedule-bottom-back" onClick={() => navigate("/app/monitoring-results/overview")}><ArrowLeft size={16}/>Back to Overview</button>
  </main>;
}

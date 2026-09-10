import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, Eye, FileText, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useOfficialResults, ReportLoadState, latestResults, departmentNames, numberOrNull, averageOf, percent, difference, comparisonResult, resultLink, type OfficialResult } from "./official-results";
import { AnalysisMultiSelect } from "./AnalysisMultiSelect";
import { ReportExportButtons } from "./ReportExportButtons";
import { exportPercent, type TableExport } from "./table-export";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import "./reports.css";
import "./analysis-screens.css";
import "./report-table-refresh.css";

export function ScorecardAnalysis() {
  const navigate = useNavigate();
  const query = useOfficialResults();
  const reportScorecards = query.items;
  const [selectedScorecards, setSelectedScorecards] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [period, setPeriod] = useState("Latest Available Result");
  const [compare, setCompare] = useState("");
  const [showGraphs, setShowGraphs] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: ScorecardAnalysisSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const rows = useMemo(() => (period === "Latest Available Result" ? latestResults(query.items) : query.items.filter(r=>r.periodKey===period)).map(r=>({...r, departments:departmentNames(r),score:numberOrNull(r.score),ownKpiWeight:r.ownWeight,linkedWeight:r.linkedWeight,comparedScore:numberOrNull(comparisonResult(query.items,r,compare)?.score)})).filter(item=>(!selectedScorecards.length || selectedScorecards.includes(item.scorecardId)) && (!departments.length || item.departments.some(d=>departments.includes(d))) && (!statuses.length || statuses.includes(item.status)) && (!search || (item.code+" "+item.name).toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>compareSortValues(scorecardAnalysisSortValue(a,sort.key) ?? "",scorecardAnalysisSortValue(b,sort.key) ?? "",sort.direction)), [query.items,period,compare,selectedScorecards,departments,statuses,search,sort]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage(1), [departments, search, selectedScorecards, statuses]);
  const sortBy = (key: ScorecardAnalysisSortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const average = averageOf(rows.map(r=>r.score));
  const scored=rows.filter((r):r is typeof r & {score:number}=>r.score!==null);
  const best = [...scored].sort((a,b)=>b.score-a.score)[0];
  const lowest = [...scored].sort((a,b)=>a.score-b.score)[0];
  const exportReport = (): TableExport => ({
    title: "ScoreCard Analysis", filename: "scorecard-analysis",
    context: [
      ["ScoreCards", selectedScorecards.length ? latestResults(reportScorecards).filter(r => selectedScorecards.includes(r.scorecardId)).map(r => `${r.code} · ${r.name}`).join(", ") : "All"],
      ["Departments", departments.join(", ") || "All"], ["Statuses", statuses.join(", ") || "All"],
      ["Period", period], ["Comparison", compare || "None"], ["Search", search || "None"], ["Sort", `${sort.key} ${sort.direction}`],
    ],
    headers: ["ScoreCard Code", "ScoreCard", "Departments Included", "Period", "Current Score",
      ...(compare ? ["Compared Score", "Difference", "Trend"] : []), "Own KPI Weight", "Linked Weight", "Status"],
    rows: rows.map(r => {
      const delta = difference(r.score, r.comparedScore);
      return [r.code, r.name, r.departments.join(", "), r.period, exportPercent(r.score),
        ...(compare ? [exportPercent(r.comparedScore), exportPercent(delta), delta === null ? "Unavailable" : delta === 0 ? "Stable" : delta > 0 ? "Improved" : "Declined"] : []),
        exportPercent(r.ownKpiWeight), exportPercent(r.linkedWeight), r.status];
    }),
  });

  return <main className="reports-page report-analysis-page">
    <nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><Link to="/app/reports/analysis">Analysis</Link><span>/</span><span>ScoreCard Analysis</span></nav>
    <header className="reports-header"><div><span>CONSOLIDATED PERFORMANCE</span><h1>ScoreCard Analysis</h1><p>Compare final ScoreCard scores, period changes and the contribution from own KPIs and linked ScoreCards.</p></div></header>
    <ReportLoadState query={query}/><section className="dynamic-filters scorecard-analysis-filters"><header><h2>Current Result Overview</h2><p>Select ScoreCards and optionally activate a period comparison.</p></header><label><span>ScoreCards</span><AnalysisMultiSelect placeholder="All EXA.SA Group ScoreCards" options={latestResults(reportScorecards).map((item) => ({ value:item.scorecardId,label:`${item.code} · ${item.name}` }))} selected={selectedScorecards} onChange={setSelectedScorecards}/></label><label><span>Departments</span><AnalysisMultiSelect placeholder="All departments" options={[...new Set(reportScorecards.flatMap(departmentNames))].map((value) => ({value,label:value}))} selected={departments} onChange={setDepartments}/></label><label><span>Result Status</span><AnalysisMultiSelect placeholder="All statuses" options={["Closed","Closed with Exceptions"].map((value) => ({value,label:value}))} selected={statuses} onChange={setStatuses}/></label><label><span>Period</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Latest Available Result</option>{[...new Set(query.items.map(r=>r.periodKey))].sort().reverse().map(key=><option key={key}>{key}</option>)}</select></label><label><span>Compare with</span><select value={compare} onChange={(event) => setCompare(event.target.value)}><option value="">No comparison</option><option>Previous Period</option><option>Same Period Last Year</option>{[...new Set(query.items.map(r=>r.periodKey))].sort().reverse().map(key=><option key={key}>{key}</option>)}</select></label></section>
    <section className="analysis-summary-cards"><article><small>Average Score</small><strong>{percent(average)}</strong><em>EXA Group · {period}</em></article><article><small>Best Performer</small><strong>{best?.name ?? "No data"}</strong><em>{percent(best?.score)}</em></article><article><small>Lowest Performer</small><strong>{lowest?.name ?? "No data"}</strong><em>{percent(lowest?.score)}</em></article><article><small>Trend vs Comparison</small><strong>{compare ? percent(averageOf(rows.map(r=>difference(r.score,r.comparedScore)))) : "—"}</strong></article></section>
    <section className="analysis-result-section"><header><div><h2>ScoreCard Result Overview</h2><p>{period}{compare ? ` compared with ${compare}` : " · Current result only"}</p></div><div><button className="graphs" onClick={() => setShowGraphs((value) => !value)}><BarChart3 size={14} />{showGraphs ? "Hide Graphs" : "View Graphs"}</button><ReportExportButtons getReport={exportReport} disabled={query.isLoading || query.isError || !rows.length}/></div></header>
      {showGraphs && <div className="analysis-chart scorecard-chart"><div className="chart-bars">{rows.map((item) => <div className="chart-group" key={item.code}><div>{item.score !== null && <i className="current" style={{ height: `${item.score}%` }} />}{compare && item.comparedScore !== null && <i className="compared" style={{ height: `${item.comparedScore}%` }} />}</div><span>{item.code}</span></div>)}</div><footer><span><i className="current" />Current Score</span>{compare && <span><i className="compared" />Compared Score</span>}</footer></div>}
      <label className="analysis-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ScoreCard..." /></label>
      <div className="report-table-wrap"><table><thead><tr><SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>ScoreCard Code</SortableTableHeader><SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>ScoreCard</SortableTableHeader><SortableTableHeader active={sort.key === "departments"} direction={sort.direction} onSort={() => sortBy("departments")}>Departments Included</SortableTableHeader><SortableTableHeader active={sort.key === "period"} direction={sort.direction} onSort={() => sortBy("period")}>Period</SortableTableHeader><SortableTableHeader active={sort.key === "score"} direction={sort.direction} onSort={() => sortBy("score")}>Current Score</SortableTableHeader>{compare && <><SortableTableHeader active={sort.key === "comparedScore"} direction={sort.direction} onSort={() => sortBy("comparedScore")}>Compared Score</SortableTableHeader><SortableTableHeader active={sort.key === "difference"} direction={sort.direction} onSort={() => sortBy("difference")}>Difference</SortableTableHeader><SortableTableHeader active={sort.key === "trend"} direction={sort.direction} onSort={() => sortBy("trend")}>Trend</SortableTableHeader></>}<SortableTableHeader active={sort.key === "ownKpiWeight"} direction={sort.direction} onSort={() => sortBy("ownKpiWeight")}>Own KPI Weight</SortableTableHeader><SortableTableHeader active={sort.key === "linkedWeight"} direction={sort.direction} onSort={() => sortBy("linkedWeight")}>Linked Weight</SortableTableHeader><SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader><th>Action</th></tr></thead><tbody>{paginatedRows.map((item) => {
        const delta = difference(item.score,item.comparedScore);
        return <tr key={item.code}><td><strong>{item.code}</strong></td><td>{item.name}</td><td>{item.departments.join(", ")}</td><td>{item.period}</td><td><strong>{percent(item.score)}</strong></td>{compare && <><td>{percent(item.comparedScore)}</td><td className={delta !== null && delta >= 0 ? "positive-difference" : "negative-difference"}>{delta !== null && delta >= 0 ? "+" : ""}{percent(delta)}</td><td><span className={`history-trend ${delta === null ? "unavailable" : delta === 0 ? "stable" : delta > 0 ? "improved" : "declined"}`}>{delta !== null && delta !== 0 && (delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}{delta !== null && delta >= 0 ? delta === 0 ? "Stable" : "Improved" : delta === null ? "Unavailable" : "Declined"}</span></td></>}<td>{item.ownKpiWeight}%</td><td>{item.linkedWeight}%</td><td><span className={`report-status ${item.status.toLowerCase().replace(/ /g, "-")}`}><i />{item.status}</span></td><td><button className="history-view" onClick={() => navigate(resultLink(item))}><Eye size={14} /></button></td></tr>;
      })}</tbody></table></div>
      <footer className="reports-pagination analysis-table-pagination"><span>Showing {rows.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, rows.length)} of {rows.length} records</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><PaginationControls page={currentPage} totalPages={pages} onPage={setPage} label="ScoreCard analysis pagination" className="analysis-pagination-controls" /></footer>
    </section>
    <button type="button" className="report-page-back" onClick={() => navigate(-1)}><ArrowLeft size={17}/>Back</button>
  </main>;
}

type ScorecardAnalysisRow = Omit<OfficialResult,"score"> & {score:number|null;comparedScore:number|null;departments:string[];ownKpiWeight:string;linkedWeight:string};
type ScorecardAnalysisSortKey = "code" | "name" | "departments" | "period" | "score" | "comparedScore" | "difference" | "trend" | "ownKpiWeight" | "linkedWeight" | "status";
function scorecardAnalysisSortValue(row: ScorecardAnalysisRow, key: ScorecardAnalysisSortKey) { switch (key) { case "departments": return row.departments.join(", "); case "period": return row.periodStart; case "difference": case "trend": return difference(row.score,row.comparedScore); default: return row[key]; } }

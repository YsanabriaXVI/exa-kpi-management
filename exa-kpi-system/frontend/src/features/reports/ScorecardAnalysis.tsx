import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, Eye, FileText, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { reportScorecards } from "./reports.data";
import { AnalysisMultiSelect } from "./AnalysisMultiSelect";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import "./reports.css";
import "./analysis-screens.css";
import "./report-table-refresh.css";

export function ScorecardAnalysis() {
  const navigate = useNavigate();
  const [selectedScorecards, setSelectedScorecards] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [period, setPeriod] = useState("Jun 2026");
  const [compare, setCompare] = useState("");
  const [showGraphs, setShowGraphs] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: ScorecardAnalysisSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const rows = useMemo(() => reportScorecards.filter((item) => (!selectedScorecards.length || selectedScorecards.includes(item.code)) && (!departments.length || item.departments.some((value) => departments.includes(value))) && (!statuses.length || statuses.includes(item.status)) && (!search || `${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase()))).map((item, index) => ({ ...item, comparedScore: Math.max(0, item.score + [-3.1, 2.4, -1.5, 4.2, -2.2, 1.1, -4.3, 2.8][index]) })).sort((left, right) => compareSortValues(scorecardAnalysisSortValue(left, sort.key), scorecardAnalysisSortValue(right, sort.key), sort.direction)), [departments, search, selectedScorecards, sort, statuses]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage(1), [departments, search, selectedScorecards, statuses]);
  const sortBy = (key: ScorecardAnalysisSortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const average = rows.length ? rows.reduce((sum, item) => sum + item.score, 0) / rows.length : 0;
  const best = [...rows].sort((a, b) => b.score - a.score)[0];
  const lowest = [...rows].sort((a, b) => a.score - b.score)[0];

  return <main className="reports-page report-analysis-page">
    <nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><Link to="/app/reports/analysis">Analysis</Link><span>/</span><span>ScoreCard Analysis</span></nav>
    <header className="reports-header"><div><span>CONSOLIDATED PERFORMANCE</span><h1>ScoreCard Analysis</h1><p>Compare final ScoreCard scores, period changes and the contribution from own KPIs and linked ScoreCards.</p></div></header>
    <section className="dynamic-filters scorecard-analysis-filters"><header><h2>Current Result Overview</h2><p>Select ScoreCards and optionally activate a period comparison.</p></header><label><span>ScoreCards</span><AnalysisMultiSelect placeholder="All EXA.SA Group ScoreCards" options={reportScorecards.map((item) => ({ value:item.code,label:`${item.code} · ${item.name}` }))} selected={selectedScorecards} onChange={setSelectedScorecards}/></label><label><span>Departments</span><AnalysisMultiSelect placeholder="All departments" options={["Operations","Sales","Customer Service","Systems"].map((value) => ({value,label:value}))} selected={departments} onChange={setDepartments}/></label><label><span>Result Status</span><AnalysisMultiSelect placeholder="All statuses" options={["Closed","Closed with Exceptions","Validated","Submitted"].map((value) => ({value,label:value}))} selected={statuses} onChange={setStatuses}/></label><label><span>Period</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Jun 2026</option><option>May 2026</option><option>Apr 2026</option></select></label><label><span>Compare with</span><select value={compare} onChange={(event) => setCompare(event.target.value)}><option value="">No comparison</option><option>Previous Period</option><option>Same Period Last Year</option><option>Custom Period</option></select></label></section>
    <section className="analysis-summary-cards"><article><small>Average Score</small><strong>{average.toFixed(2)}%</strong><em>EXA Group · {period}</em></article><article><small>Best Performer</small><strong>{best?.name ?? "No data"}</strong><em>{best?.score.toFixed(2)}%</em></article><article><small>Lowest Performer</small><strong>{lowest?.name ?? "No data"}</strong><em>{lowest?.score.toFixed(2)}%</em></article><article><small>Trend vs Comparison</small><strong className="up"><TrendingUp size={18} />Improved</strong></article></section>
    <section className="analysis-result-section"><header><div><h2>ScoreCard Result Overview</h2><p>{period}{compare ? ` compared with ${compare}` : " · Current result only"}</p></div><div><button className="graphs" onClick={() => setShowGraphs((value) => !value)}><BarChart3 size={14} />{showGraphs ? "Hide Graphs" : "View Graphs"}</button><button className="xls"><Download size={14} />Export XLS</button><button className="pdf"><FileText size={14} />Export PDF</button></div></header>
      {showGraphs && <div className="analysis-chart scorecard-chart"><div className="chart-bars">{rows.map((item) => <div className="chart-group" key={item.code}><div><i className="current" style={{ height: `${item.score}%` }} />{compare && <i className="compared" style={{ height: `${item.comparedScore}%` }} />}</div><span>{item.code}</span></div>)}</div><footer><span><i className="current" />Current Score</span>{compare && <span><i className="compared" />Compared Score</span>}</footer></div>}
      <label className="analysis-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ScoreCard..." /></label>
      <div className="report-table-wrap"><table><thead><tr><SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>ScoreCard Code</SortableTableHeader><SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>ScoreCard</SortableTableHeader><SortableTableHeader active={sort.key === "departments"} direction={sort.direction} onSort={() => sortBy("departments")}>Departments Included</SortableTableHeader><SortableTableHeader active={sort.key === "period"} direction={sort.direction} onSort={() => sortBy("period")}>Period</SortableTableHeader><SortableTableHeader active={sort.key === "score"} direction={sort.direction} onSort={() => sortBy("score")}>Current Score</SortableTableHeader>{compare && <><SortableTableHeader active={sort.key === "comparedScore"} direction={sort.direction} onSort={() => sortBy("comparedScore")}>Compared Score</SortableTableHeader><SortableTableHeader active={sort.key === "difference"} direction={sort.direction} onSort={() => sortBy("difference")}>Difference</SortableTableHeader><SortableTableHeader active={sort.key === "trend"} direction={sort.direction} onSort={() => sortBy("trend")}>Trend</SortableTableHeader></>}<SortableTableHeader active={sort.key === "ownKpiWeight"} direction={sort.direction} onSort={() => sortBy("ownKpiWeight")}>Own KPI Weight</SortableTableHeader><SortableTableHeader active={sort.key === "linkedWeight"} direction={sort.direction} onSort={() => sortBy("linkedWeight")}>Linked Weight</SortableTableHeader><SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader><th>Action</th></tr></thead><tbody>{paginatedRows.map((item) => {
        const difference = item.score - item.comparedScore;
        return <tr key={item.code}><td><strong>{item.code}</strong></td><td>{item.name}</td><td>{item.departments.join(", ")}</td><td>{period}</td><td><strong>{item.score.toFixed(2)}%</strong></td>{compare && <><td>{item.comparedScore.toFixed(2)}%</td><td className={difference >= 0 ? "positive-difference" : "negative-difference"}>{difference >= 0 ? "+" : ""}{difference.toFixed(2)}%</td><td><span className={`history-trend ${difference >= 0 ? "improved" : "declined"}`}>{difference >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{difference >= 0 ? "Improved" : "Declined"}</span></td></>}<td>{item.ownKpiWeight}%</td><td>{item.linkedWeight}%</td><td><span className={`report-status ${item.status.toLowerCase().replace(/ /g, "-")}`}><i />{item.status}</span></td><td><button className="history-view" onClick={() => navigate(`/app/reports/scorecard-result-detail?scorecardCode=${encodeURIComponent(item.code)}&from=analysis`)}><Eye size={14} /></button></td></tr>;
      })}</tbody></table></div>
      <footer className="reports-pagination analysis-table-pagination"><span>Showing {rows.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, rows.length)} of {rows.length} records</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><PaginationControls page={currentPage} totalPages={pages} onPage={setPage} label="ScoreCard analysis pagination" className="analysis-pagination-controls" /></footer>
    </section>
    <button type="button" className="report-page-back" onClick={() => navigate(-1)}><ArrowLeft size={17}/>Back</button>
  </main>;
}

type ScorecardAnalysisRow = (typeof reportScorecards)[number] & { comparedScore: number };
type ScorecardAnalysisSortKey = "code" | "name" | "departments" | "period" | "score" | "comparedScore" | "difference" | "trend" | "ownKpiWeight" | "linkedWeight" | "status";
function scorecardAnalysisSortValue(row: ScorecardAnalysisRow, key: ScorecardAnalysisSortKey) { switch (key) { case "departments": return row.departments.join(", "); case "period": return 0; case "difference": case "trend": return row.score - row.comparedScore; default: return row[key]; } }

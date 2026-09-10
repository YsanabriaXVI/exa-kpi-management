import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Download, Eye, EyeOff, FileText, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useOfficialResults, ReportLoadState, OfficialTraffic, latestResults, comparisonResult, departmentNames, percent, points, numberOrNull, averageOf, difference, resultLink, type OfficialEvaluation } from "./official-results";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { ReportExportButtons } from "./ReportExportButtons";
import { exportPercent, type TableExport } from "./table-export";
import "./reports.css";
import "./analysis-screens.css";
import "./report-table-refresh.css";
const identity=(e:OfficialEvaluation)=>[e.configurationId,e.evaluationKind,e.entityId??""].join(":");
const raw=(value:string|number|null|undefined,unit:string|null)=>numberOrNull(value)===null?"—":Number(value).toLocaleString()+" "+(unit??"");
export function KpiAnalysis() {
  const navigate=useNavigate(); const query=useOfficialResults();
  const [analysisType,setAnalysisType]=useState("KPI Trend"); const [view,setView]=useState("Score Trend");
  const [compare,setCompare]=useState("Previous Period"); const [selectedKpi,setSelectedKpi]=useState("");
  const [scorecard,setScorecard]=useState("all"); const [period,setPeriod]=useState("all"); const [search,setSearch]=useState("");
  const [showRaw,setShowRaw]=useState(false); const [showGraphs,setShowGraphs]=useState(false);
  const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(10);
  const [sort,setSort]=useState<{key:string;direction:SortDirection}>({key:"periodStart",direction:"asc"});
  const options=useMemo(()=>[...new Map(query.items.flatMap(r=>r.evaluations).map(e=>[identity(e),e])).values()],[query.items]);
  const activeKpi=selectedKpi || (options[0]?identity(options[0]):"");
  const selected=options.find(e=>identity(e)===activeKpi);
  const periods=[...new Set(query.items.map(r=>r.periodKey))].sort().reverse();
  const effectivePeriod=analysisType === "KPI Benchmarking" && period === "all" ? periods[0] : period;
  const rows=useMemo(()=>query.items.filter(r=>(scorecard==="all"||r.scorecardId===scorecard)&&(effectivePeriod==="all"||r.periodKey===effectivePeriod)).flatMap(card=>card.evaluations.filter(e=>identity(e)===activeKpi).map(e=>{
    const comparedCard=comparisonResult(query.items,card,compare);
    const previous=comparedCard?.evaluations.find(p=>identity(p)===identity(e));
    const compatible=previous?.unit===e.unit;
    return {...e,card,period:card.period,periodStart:card.periodStart,scorecardName:card.name,comparedPeriod:comparedCard?.period??null,compared:compatible?previous?.result??null:null,comparedScore:previous?.score??null,periodDifference:compatible?difference(e.result,previous?.result):null,goalDifference:e.historical?null:e.goalUnit===e.unit?difference(e.result,e.goal):null,scoreDifference:difference(e.score,previous?.score)};
  })).filter(e=>!search||(e.code+" "+e.name+" "+e.card.name+" "+e.period).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>compareSortValues(sort.key==="score"?numberOrNull(a.score):(a as any)[sort.key],sort.key==="score"?numberOrNull(b.score):(b as any)[sort.key],sort.direction)),[query.items,scorecard,effectivePeriod,activeKpi,compare,search,sort]);
  const scored=rows.filter(r=>numberOrNull(r.score)!==null).sort((a,b)=>Number(b.score)-Number(a.score));
  const best=scored[0],lowest=scored[scored.length-1];const average=averageOf(rows.map(r=>r.score));
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const currentPage=Math.min(page,pages);const pageStart=(currentPage-1)*pageSize;const visible=rows.slice(pageStart,pageStart+pageSize);
  const exportReport = (): TableExport => ({
    title: "KPI Analysis", filename: "kpi-analysis",
    context: [
      ["Analysis", analysisType], ["View", view], ["KPI / Evaluation", selected ? `${selected.configCode} · ${selected.name}${selected.entityLabel ? " / " + selected.entityLabel : ""}` : "None"],
      ["ScoreCard", scorecard === "all" ? "All" : query.items.find(r => r.scorecardId === scorecard)?.name ?? scorecard],
      ["Period", effectivePeriod ?? "None"], ["Comparison", compare], ["Raw Results", showRaw ? "Visible" : "Hidden"],
      ["Search", search || "None"], ["Sort", `${sort.key} ${sort.direction}`],
    ],
    headers: ["KPI Code", "KPI Name / Entity", "ScoreCard", "Period", "Goal", ...(showRaw ? ["Current Result"] : []),
      view === "Score Trend" ? "Current Score" : "Difference vs Goal", "Extra Points", "Compared Period", "Compared Result / Score", "Period Difference", "Goal Met", "Traffic Light"],
    rows: rows.map(r => [r.code, r.name + (r.entityLabel ? " / " + r.entityLabel : ""),
      [r.card.name, departmentNames(r.card).join(", ")].filter(Boolean).join("\n"), r.period,
      `${r.goal ?? "—"} ${r.goalUnit ?? ""}`.trim(), ...(showRaw ? [raw(r.result, r.unit)] : []),
      view === "Score Trend" ? exportPercent(r.score) : raw(r.goalDifference, r.unit), points(r.extraPoints), r.comparedPeriod,
      view === "Score Trend" ? exportPercent(r.comparedScore) : raw(r.compared, r.unit),
      view === "Score Trend" ? points(r.scoreDifference) : raw(r.periodDifference, r.unit),
      r.goalMet === null ? null : r.goalMet ? "Yes" : "No", r.trafficLight]),
  });
  const header=(key:string,label:string)=><SortableTableHeader active={sort.key===key} direction={sort.direction} onSort={()=>{setSort({key,direction:sort.key===key&&sort.direction==="asc"?"desc":"asc"});setPage(1);}}>{label}</SortableTableHeader>;
  return <main className="reports-page report-analysis-page">
    <nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><Link to="/app/reports/analysis">Analysis</Link><span>/</span><span>KPI Analysis</span></nav>
    <header className="reports-header"><div><span>KPI PERFORMANCE</span><h1>KPI Analysis</h1><p>Analyze official closed KPI results over time or across ScoreCards.</p></div></header>
    <ReportLoadState query={query}/>
    <section className="dynamic-filters"><header><h2>Dynamic Filters</h2><p>Goals, results and evaluation context come from the selected closed periods.</p></header>
      <label><span>Analysis Type</span><select value={analysisType} onChange={e=>{setAnalysisType(e.target.value);setPage(1);setSort({key:e.target.value==="KPI Benchmarking"?"score":"periodStart",direction:e.target.value==="KPI Benchmarking"?"desc":"asc"});}}><option>KPI Trend</option><option>KPI Benchmarking</option></select></label>
      <label><span>Analysis View</span><select value={view} onChange={e=>setView(e.target.value)}><option>Goal vs Result</option><option>Score Trend</option></select></label>
      <label><span>Compare with</span><select value={compare} onChange={e=>setCompare(e.target.value)}><option>Previous Period</option><option>Same Period Last Year</option>{periods.map(p=><option key={p}>{p}</option>)}</select></label>
      <label><span>KPI / Evaluation</span><select value={activeKpi} onChange={e=>{setSelectedKpi(e.target.value);setPage(1);}}>{options.map(e=><option key={identity(e)} value={identity(e)}>{e.configCode} · {e.name}{e.entityLabel?" / "+e.entityLabel:""}</option>)}</select></label>
      <label><span>ScoreCards</span><select value={scorecard} onChange={e=>{setScorecard(e.target.value);setPage(1);}}><option value="all">All ScoreCards</option>{latestResults(query.items).map(r=><option key={r.scorecardId} value={r.scorecardId}>{r.code} · {r.name}</option>)}</select></label>
      <label><span>Period Range</span><select value={period} onChange={e=>{setPeriod(e.target.value);setPage(1);}}><option value="all">{analysisType==="KPI Benchmarking"?"Latest closed period":"All closed periods"}</option>{periods.map(p=><option key={p}>{p}</option>)}</select></label>
    </section>
    <section className="analysis-summary-cards"><article><small>Goal Met</small><strong>{rows.filter(r=>r.goalMet===true).length} / {rows.filter(r=>r.goalMet!==null).length}</strong></article><article><small>Best {analysisType==="KPI Trend"?"Period":"Performer"}</small><strong>{best?(analysisType==="KPI Trend"?best.period:best.card.name):"—"}</strong><em>{percent(best?.score)}</em></article><article><small>Lowest {analysisType==="KPI Trend"?"Period":"Performer"}</small><strong>{lowest?(analysisType==="KPI Trend"?lowest.period:lowest.card.name):"—"}</strong><em>{percent(lowest?.score)}</em></article><article><small>Average Score</small><strong>{percent(average)}</strong></article></section>
    <section className="analysis-result-section"><header><div><h2>{analysisType} · {selected?.name ?? "No official results"}</h2><p>{view} · Compared with {compare}</p></div><div><button onClick={()=>setShowRaw(!showRaw)}>{showRaw?<EyeOff size={14}/>:<Eye size={14}/>} {showRaw?"Hide Raw Results":"View Raw Results"}</button><ReportExportButtons getReport={exportReport} disabled={query.isLoading || query.isError || !rows.length}/><button className="graphs" onClick={()=>setShowGraphs(!showGraphs)}><BarChart3 size={14}/>{showGraphs?"Hide Graphs":"View Graphs"}</button></div></header>
      {showGraphs&&<div className="analysis-chart"><div className="chart-y-label">Official Score (%)</div><div className="chart-bars">{rows.map(r=><div className="chart-group" key={r.id}><div>{r.score!==null&&<i title={percent(r.score)} className="current" style={{height:Math.max(0,Math.min(100,Number(r.score)))+"%"}}/>}{r.comparedScore!==null&&<i title={percent(r.comparedScore)} className="compared" style={{height:Math.max(0,Math.min(100,Number(r.comparedScore)))+"%"}}/>}</div><span>{r.period} · {r.card.code}</span></div>)}</div><footer><span>Current Score</span><span>Compared Score</span></footer></div>}
      <label className="analysis-search"><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search KPI, ScoreCard or period…"/></label>
      <div className="report-table-wrap"><table><thead><tr>{header("code","KPI Code")}{header("name","KPI Name / Entity")}{header("scorecardName","ScoreCard")}{header("periodStart","Period")}{header("goal","Goal")}{showRaw&&header("result","Current Result")}{header("score",view==="Score Trend"?"Compliance %":"Difference vs Goal")}<th>Extra Points</th>{header("comparedPeriod","Compared Period")}{header("compared","Compared Result / Score")}<th>Period Difference</th><th>Goal Met</th><th>Traffic Light</th><th>Details</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.code}</td><td>{r.name}{r.entityLabel?" / "+r.entityLabel:""}</td><td>{r.card.name}<small>{departmentNames(r.card).join(", ")}</small></td><td>{r.period}</td><td>{r.goal ?? "—"} {r.goalUnit}</td>{showRaw&&<td>{raw(r.result,r.unit)}</td>}<td>{view==="Score Trend"?percent(r.score):raw(r.goalDifference,r.unit)}</td><td>{points(r.extraPoints)}</td><td>{r.comparedPeriod ?? "—"}</td><td>{view==="Score Trend"?percent(r.comparedScore):raw(r.compared,r.unit)}</td><td>{view==="Score Trend"?points(r.scoreDifference):raw(r.periodDifference,r.unit)}</td><td>{r.goalMet===null?"—":r.goalMet?"Yes":"No"}</td><td><OfficialTraffic value={r.trafficLight}/></td><td><Link to={resultLink(r.card)}>View</Link></td></tr>)}</tbody></table></div>
      {!rows.length&&!query.isLoading&&<p className="reports-empty">No official closed results match these filters.</p>}
      <footer className="reports-pagination analysis-table-pagination"><span>{rows.length} records</span><RowsPerPageSelect value={pageSize} onChange={v=>{setPageSize(v);setPage(1);}}/><PaginationControls page={currentPage} totalPages={pages} onPage={setPage} label="KPI analysis pagination" className="analysis-pagination-controls"/></footer>
    </section><button className="report-page-back" onClick={()=>navigate(-1)}><ArrowLeft size={17}/>Back</button>
  </main>;
}

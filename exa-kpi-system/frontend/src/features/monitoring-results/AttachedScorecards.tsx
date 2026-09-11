import { usePeriodLabel, usePeriodLabels } from "./use-period-label";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PaginationControls } from "../../components/PaginationControls";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { monitoringReadService } from "./monitoring-results.service";
import "./monitoring-results.css";

export function AttachedScorecards() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const id = params.get("monitoringPeriodId") ?? "";
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[search,setSearch]=useState(""),[sortOrder,setSortOrder]=useState<"asc"|"desc">("asc"),[expanded,setExpanded]=useState<string[]>([]);
  const periods=useQuery({queryKey:["monitoring-period-options"],queryFn:()=>monitoringReadService.overview({page:1,pageSize:100,sortBy:"periodStart",sortOrder:"desc"}),retry:false});
  const query=useQuery({queryKey:["monitoring-attached",id,page,pageSize,search,sortOrder],queryFn:()=>monitoringReadService.attachedScorecards(id,{page,pageSize,search,sortBy:"code",sortOrder}),enabled:Boolean(id),retry:false});
  const periodLabel = usePeriodLabel(query.data?.period);
  const displayPeriodLabel = usePeriodLabels(periods.data?.items ?? []);
  const toggle=(code:string)=>setExpanded(items=>items.includes(code)?items.filter(item=>item!==code):[...items,code]);
  return <main className="monitor-page attached-scorecards-page">
    <nav className="kpi-breadcrumb"><Link to="/app/monitoring-results/overview">Monitoring Overview</Link><span>/</span><span>Attached ScoreCards</span></nav>
    <header className="monitor-header schedule-header"><div><span className="monitor-eyebrow">PERIOD SNAPSHOT</span><h1>Attached ScoreCards</h1><p>ScoreCards and KPI assignments frozen for this Monitoring Period.</p></div></header>
    {!id ? <section className="monitoring-period-selector"><header><h2>Select Monitoring Period</h2><p>Choose a Pool and Input Period to inspect its ScoreCards.</p></header><select defaultValue="" onChange={event=>event.target.value&&navigate(`/app/monitoring-results/attached-scorecards?monitoringPeriodId=${event.target.value}`,{replace:true})}><option value="" disabled>Select Pool and Input Period…</option>{periods.data?.items.map(item=><option key={item.id} value={item.id}>{item.poolCode} · {item.poolName} · {displayPeriodLabel(item)} · {item.status}</option>)}</select>{periods.isLoading&&<p>Loading Monitoring Periods…</p>}{periods.isError&&<p className="result-entry-live-error">Monitoring Periods could not be loaded.</p>}</section>
    : query.isLoading ? <section className="result-entry-live-state"><p>Loading ScoreCards…</p></section>
    : query.isError ? <section className="result-entry-live-state"><p>ScoreCards could not be loaded.</p><button onClick={()=>query.refetch()}>Retry</button></section>
    : <section className="attached-section"><header><div><h2>{query.data?.period.code}</h2><p>{periodLabel} · {query.data?.period.status}</p></div></header>
      <div className="result-toolbar attached-toolbar"><label><Search size={16}/><input value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}} placeholder="Search ScoreCard…"/></label><button type="button" className="entry-secondary" onClick={()=>setSortOrder(value=>value==="asc"?"desc":"asc")}>Code {sortOrder.toUpperCase()}</button></div>
      <div className="attached-scorecards-table-wrap"><table className="attached-scorecards-table"><thead><tr><th/><th>ScoreCard</th><th>Departments</th><th>Entry Status</th><th>Selected KPIs</th><th>Preview Score</th><th>Traffic Light</th></tr></thead><tbody>{query.data?.data.map((row:any)=>{const open=expanded.includes(row.code);return <Fragment key={row.id}><tr><td><button className="expand-icon" onClick={()=>toggle(row.code)}>{open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</button></td><td><small>{row.code}</small><strong>{row.name}</strong></td><td>{row.departments.map((department:any)=>department.name??department.code??department).join(", ")||"—"}</td><td>{row.entryStatus.replaceAll("_"," ")}</td><td>{row.entered}/{row.expected}</td><td>{row.previewScore??"—"}</td><td>{row.trafficLights.green} / {row.trafficLights.yellow} / {row.trafficLights.red}</td></tr>{open&&<tr className="attached-expanded-row"><td colSpan={7}><div className="schedule-table-wrap"><table><thead><tr><th>KPI</th><th>Unit</th><th>Goal</th><th>Result</th><th>Score</th><th>Weight</th><th>Status</th></tr></thead><tbody>{row.kpis.map((kpi:any)=><tr key={kpi.id}><td><small>{kpi.code}</small><strong>{kpi.name}</strong></td><td>{kpi.unit??"—"}</td><td>{kpi.goal??"—"}</td><td>{kpi.result??"—"}</td><td>{kpi.score??"—"}</td><td>{kpi.weight}%</td><td>{kpi.entryStatus}</td></tr>)}</tbody></table></div></td></tr>}</Fragment>})}</tbody></table><footer className="schedule-table-pagination"><span>{query.data?.meta.totalItems??0} ScoreCards</span><RowsPerPageSelect value={pageSize} onChange={value=>{setPageSize(value);setPage(1)}}/><PaginationControls page={page} totalPages={Math.max(1,query.data?.meta.totalPages??1)} onPage={setPage} label="ScoreCards pagination"/></footer></div>
    </section>}
    <button className="monitor-back schedule-bottom-back" onClick={()=>navigate("/app/monitoring-results/overview")}><ArrowLeft size={16}/>Back to Overview</button>
  </main>;
}

import { periodDisplay } from "./period-display";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PaginationControls } from "../../components/PaginationControls";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { monitoringReadService } from "./monitoring-results.service";
import "./monitoring-results.css";

export function PoolInputSchedule() {
  const navigate=useNavigate(); const [params]=useSearchParams(); const poolId=params.get("poolId")??"";
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[search,setSearch]=useState(""),[sortOrder,setSortOrder]=useState<"asc"|"desc">("asc");
  const pools=useQuery({queryKey:["monitoring-pool-options"],queryFn:()=>kpiPoolService.list(),retry:false});
  const query=useQuery({queryKey:["monitoring-schedule",poolId,page,pageSize,search,sortOrder],queryFn:()=>monitoringReadService.inputSchedule(poolId,{page,pageSize,search,sortBy:"periodStart",sortOrder}),enabled:Boolean(poolId),retry:false});
  const calendar = useQuery({ queryKey: ["kpi-pool-periods", Number(poolId)], queryFn: () => kpiPoolService.getInputPeriods(Number(poolId)), enabled: Boolean(poolId) });
  const displayLabel = (row: any) => calendar.data?.data.length ? periodDisplay({ start: row.periodStart, end: row.periodEnd }, calendar.data.data).label : row.periodKey;
  return <main className="monitor-page">
    <nav className="kpi-breadcrumb"><Link to="/app/monitoring-results/overview">Monitoring Overview</Link><span>/</span><span>Pool Input Schedule</span></nav>
    <header className="monitor-header schedule-header"><div><span className="monitor-eyebrow">POOL PERIOD CONTROL</span><h1>Pool Input Schedule</h1><p>Pool periods and their real downstream Monitoring state.</p></div></header>
    {!poolId ? <section className="monitoring-period-selector"><header><h2>Select KPI Pool</h2><p>Choose a Pool to inspect materialized and future Input Periods.</p></header><select defaultValue="" onChange={event=>event.target.value&&navigate(`/app/monitoring-results/pool-input-schedule?poolId=${event.target.value}`,{replace:true})}><option value="" disabled>Select KPI Pool…</option>{pools.data?.map(pool=><option key={pool.id} value={pool.id}>{pool.code} · {pool.name}</option>)}</select>{pools.isLoading&&<p>Loading KPI Pools…</p>}{pools.isError&&<p className="result-entry-live-error">KPI Pools could not be loaded.</p>}</section>
    : query.isLoading ? <section className="result-entry-live-state"><p>Loading Input Periods…</p></section>
    : query.isError ? <section className="result-entry-live-state"><p>Input Periods could not be loaded.</p><button onClick={()=>query.refetch()}>Retry</button></section>
    : <><section className="monitor-pool-identity"><div className="monitor-pool-identity-heading"><div><small>{query.data?.pool.code}</small><h2>{query.data?.pool.name}</h2></div></div></section><section className="schedule-table-section"><div className="schedule-table-filters"><label className="schedule-search"><Search size={17}/><input value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}} placeholder="Search period or status…"/></label><button className="entry-secondary" onClick={()=>setSortOrder(value=>value==="asc"?"desc":"asc")}>Period {sortOrder.toUpperCase()}</button></div><div className="schedule-table-wrap"><table><thead><tr><th>Input Period</th><th>Pool Stage</th><th>KPI Lines</th><th>Entered</th><th>Pending</th><th>Validation</th><th>Monitoring Status</th><th>Closed At</th><th>Action</th></tr></thead><tbody>{query.data?.data.map((row:any)=><tr key={row.periodKey}><td><strong>{displayLabel(row)}</strong></td><td>{row.poolWorkflowStatus}</td><td>{row.expected??"—"}</td><td>{row.entered??"—"}</td><td>{row.pending??"—"}</td><td>{row.validation}</td><td>{row.status.replaceAll("_"," ")}</td><td>{row.closedAt?new Date(row.closedAt).toLocaleString():"—"}</td><td>{row.monitoringPeriod?<button className="table-period-action" onClick={()=>navigate(`/app/monitoring-results/detail?monitoringPeriodId=${row.monitoringPeriod.id}`)}><Eye size={14}/>View</button>:<span>Not available yet</span>}</td></tr>)}</tbody></table><footer className="schedule-table-pagination"><span>{query.data?.meta.totalItems??0} periods</span><RowsPerPageSelect value={pageSize} onChange={value=>{setPageSize(value);setPage(1)}}/><PaginationControls page={page} totalPages={Math.max(1,query.data?.meta.totalPages??1)} onPage={setPage} label="Input periods pagination"/></footer></div></section></>}
    <button className="monitor-back schedule-bottom-back" onClick={()=>navigate("/app/monitoring-results/overview")}><ArrowLeft size={16}/>Back to Overview</button>
  </main>;
}

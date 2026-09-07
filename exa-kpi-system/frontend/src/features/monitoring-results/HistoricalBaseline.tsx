import { useEffect, useRef, useState } from "react";
import { monitoringRequest } from "./monitoring-results.service";
export type HistoricalContext = {
  state: string; errorCode: string | null;
  requiredPeriod: {key:string;start:string;end:string} | null;
  resolution: {value:string;sourceType:string;reason:string|null;resolvedAt:string;resolvedBy:string;provenance: {poolName?:string;scorecardName?:string;kpiCode?:string};unit:{symbol:string}} | null;
};
type Candidate = {id:string;value:string;unit:string;periodKey:string;poolName:string;scorecardName:string;kpiCode:string;kpiName:string;subjectLabel:string|null;rank:number};
type CandidateResponse = {baselineVersion:number;requiredPeriod:{key:string;start:string;end:string};unit:{symbol:string};candidates:Candidate[];page:number;total:number};
const base = (periodId:string,inputId:string) => `/v1/monitoring-periods/${periodId}/inputs/${inputId}`;
export const baselineApi = {
  candidates:(periodId:string,inputId:string,query="",page=1) => monitoringRequest<CandidateResponse>(`${base(periodId,inputId)}/baseline-candidates?query=${encodeURIComponent(query)}&page=${page}`),
  select:(periodId:string,inputId:string,expectedBaselineVersion:number,sourceResultId:string) => monitoringRequest(`${base(periodId,inputId)}/baseline-resolution`,{method:"PUT",body:JSON.stringify({expectedBaselineVersion,sourceResultId})}),
  manual:(periodId:string,inputId:string,expectedBaselineVersion:number,value:string,reason:string) => monitoringRequest(`${base(periodId,inputId)}/baseline-resolution/manual`,{method:"POST",body:JSON.stringify({expectedBaselineVersion,value,reason})}),
};
export function HistoricalBaseline({periodId,inputId,name,reference,unit,context,disabled,onSaved}:{
  periodId:string;inputId:string;name:string;reference:string;unit:string|null;context:HistoricalContext;
  disabled:boolean;onSaved:()=>Promise<void>;
}) {
  const [open,setOpen]=useState(false);
  const resolution=context.resolution;
  return <article className="historical-baseline">
    <strong>{name}</strong>
    <p>Reference: {reference==="PREVIOUS_PERIOD"?"Previous Period":"Same Period Previous Year"} · Required baseline: {context.requiredPeriod?.key??"Unavailable"}</p>
    {resolution?<><p>Baseline: {resolution.value} {unit} · {resolution.sourceType==="AUTO_MATCH"?"Automatically matched":resolution.sourceType==="USER_MATCH"?"User-selected historical Result":"Manual baseline"}</p>
      <p>{[resolution.provenance.poolName,resolution.provenance.scorecardName,resolution.provenance.kpiCode,resolution.reason].filter(Boolean).join(" / ")}</p>
      <small>Resolved by {resolution.resolvedBy} · {new Date(resolution.resolvedAt).toLocaleString()}</small></>:<p>Baseline: {context.state==="INVALID"?"Invalid historical context":"Missing"}</p>}
    {context.errorCode&&<p>{context.errorCode}</p>}
    <button disabled={disabled||!context.requiredPeriod} onClick={()=>setOpen(true)}>{resolution?"Change Baseline":"Resolve Baseline"}</button>
    {open&&<BaselineDialog periodId={periodId} inputId={inputId} name={name} onClose={()=>setOpen(false)} onSaved={onSaved}/>}
  </article>;
}
function BaselineDialog({periodId,inputId,name,onClose,onSaved}:{periodId:string;inputId:string;name:string;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [data,setData]=useState<CandidateResponse|null>(null);
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState("");
  const [value,setValue]=useState("");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  async function search(page=1) {
    setBusy(true);setError("");setSelected("");
    try {setData(await baselineApi.candidates(periodId,inputId,query,page));} catch(e){setError(e instanceof Error?e.message:"Unable to load historical Results.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{if(dialog.current?.showModal)dialog.current.showModal();else dialog.current?.setAttribute("open","");void search();},[]);
  async function save(manual:boolean) {
    if(!data||busy)return;
    setBusy(true);setError("");
    try {
      if(manual)await baselineApi.manual(periodId,inputId,data.baselineVersion,value,reason);
      else await baselineApi.select(periodId,inputId,data.baselineVersion,selected);
      await onSaved();onClose();
    } catch(e){setError(e instanceof Error?e.message:"Baseline could not be saved. Reload context and retry.");}
    finally{setBusy(false);}
  }
  return <dialog ref={dialog} aria-labelledby="baseline-dialog-title" className="baseline-dialog" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <header><h2 id="baseline-dialog-title">Resolve Historical Baseline</h2><button disabled={busy} onClick={onClose} aria-label="Close baseline resolution">Close</button></header>
    <p>{name}</p>
    {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>search()}>Reload baseline context</button></p>}
    {data&&<section><h3>Required Historical Context</h3><p>Required period: {data.requiredPeriod.key} ({data.requiredPeriod.start} – {data.requiredPeriod.end})</p><p>Required Result Unit: {data.unit.symbol}</p></section>}
    <form onSubmit={e=>{e.preventDefault();void search();}}><label>Search historical Results<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="KPI, Pool, Scorecard or entity"/></label><button disabled={busy}>Search</button></form>
    <h3>Suggested Matches</h3>
    {busy&&<p role="status">Loading…</p>}
    {data&&!data.candidates.length&&<p>No eligible closed Results found. You can provide a manual baseline.</p>}
    {data?.candidates.map(c=><label className="baseline-candidate" key={c.id}><input type="radio" name="baseline-candidate" value={c.id} checked={selected===c.id} disabled={busy} onChange={()=>setSelected(c.id)}/><span><strong>{c.kpiCode} {c.kpiName}</strong><br/>{c.poolName} / {c.scorecardName} / {c.periodKey}{c.subjectLabel?` / ${c.subjectLabel}`:""}<br/>{c.value} {c.unit}</span></label>)}
    {data&&data.total>25&&<nav aria-label="Candidate pages"><button disabled={busy||data.page===1} onClick={()=>search(data.page-1)}>Previous</button><span>Page {data.page}</span><button disabled={busy||data.page*25>=data.total} onClick={()=>search(data.page+1)}>Next</button></nav>}
    <button className="entry-primary" disabled={busy||!selected} onClick={()=>save(false)}>Use Selected Baseline</button>
    <section><h3>Manual Baseline</h3><p>Use a historical value from outside EXA. The required period and unit remain fixed.</p>
      <label>Baseline value<input inputMode="decimal" value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/></label>
      <label>Reason / Source<textarea value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} placeholder="Describe the historical source (at least 10 characters)"/></label>
      <button className="entry-primary" disabled={busy||!data||!/^\d{1,14}(\.\d{1,6})?$/.test(value)||reason.trim().length<10} onClick={()=>save(true)}>Save Manual Baseline</button>
    </section>
  </dialog>;
}

import { useEffect, useRef, useState } from "react";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { monitoringRequest } from "./monitoring-results.service";
export type HistoricalContext = {
  state: string; errorCode: string | null;
  requiredPeriod: {key:string;start:string;end:string} | null;
  resolution: {value:string;sourceType:string;reason:string|null;sourceReference?:string|null;resolvedAt:string;resolvedBy:string;provenance: {poolName?:string;scorecardName?:string;kpiCode?:string};unit:{symbol:string}} | null;
};
type Candidate = {id:string;value:string;unit:string;periodKey:string;poolName:string;scorecardName:string;kpiCode:string;kpiName:string;subjectLabel:string|null;rank:number};
type CandidateResponse = {baselineVersion:number;requiredPeriod:{key:string;start:string;end:string};unit:{symbol:string};candidates:Candidate[];page:number;total:number};
const base = (periodId:string,inputId:string) => `/v1/monitoring-periods/${periodId}/inputs/${inputId}`;
export const baselineApi = {
  candidates:(periodId:string,inputId:string,query="",page=1,pool="") => monitoringRequest<CandidateResponse>(`${base(periodId,inputId)}/baseline-candidates?query=${encodeURIComponent(query)}&page=${page}${pool ? `&pool=${encodeURIComponent(pool)}` : ""}`),
  select:(periodId:string,inputId:string,expectedBaselineVersion:number,sourceResultId:string) => monitoringRequest(`${base(periodId,inputId)}/baseline-resolution`,{method:"PUT",body:JSON.stringify({expectedBaselineVersion,sourceResultId})}),
  manual:(periodId:string,inputId:string,expectedBaselineVersion:number,value:string,reason:string,sourceReference:string) => monitoringRequest(`${base(periodId,inputId)}/baseline-resolution/manual`,{method:"POST",body:JSON.stringify({expectedBaselineVersion,value,reason,sourceReference})}),
};
export function HistoricalBaseline({periodId,inputId,name,reference,unit,context,disabled,onSaved,scope="OVERALL"}:{
  periodId:string;inputId:string;name:string;reference:string;unit:string|null;context:HistoricalContext;
  disabled:boolean;onSaved:()=>Promise<void>;scope?:"OVERALL"|"ENTITY"|"CONTRIBUTED";
}) {
  const [open,setOpen]=useState(false);
  const resolution=context.resolution;
  return <article className="historical-baseline">
    <strong>{name}</strong>
    <p>{scope === "CONTRIBUTED" ? "Baseline requerido: total historico de las mismas entidades contribuyentes." : scope === "ENTITY" ? "Baseline requerido: resultado historico de esta entidad." : "Baseline requerido: resultado global del periodo de referencia."}</p>
    <p>AUTO MATCH busca una referencia historica compatible. Si no hay una coincidencia unica, usa MANUAL MATCH o ingresa un baseline documentado.</p>
    <p>Reference: {reference==="PREVIOUS_PERIOD"?"Previous Period":"Same Period Previous Year"} · Required baseline: {context.requiredPeriod?.key??"Unavailable"}</p>
    {resolution?<><p>Baseline: {resolution.value} {unit} · {resolution.sourceType==="AUTO_MATCH"?"Automatically matched":resolution.sourceType==="USER_MATCH"?"User-selected historical Result":"Manual baseline (warning)"}</p>
      <p>{[resolution.provenance.poolName,resolution.provenance.scorecardName,resolution.provenance.kpiCode,resolution.reason].filter(Boolean).join(" / ")}</p>
      {resolution.sourceType === "MANUAL" && <p>Source reference: {resolution.sourceReference ?? "Required - update this baseline"}. Historical provenance and contributor composition cannot be verified automatically.</p>}
      <small>Resolved by {resolution.resolvedBy} · {new Date(resolution.resolvedAt).toLocaleString()}</small></>:<p>Baseline: {context.state==="INVALID"?"Invalid historical context":"Pending - resolve during Result Entry"}</p>}
    {context.errorCode&&<p>{context.errorCode}</p>}
    <button disabled={disabled||!context.requiredPeriod} onClick={()=>setOpen(true)}>{resolution?"Change Baseline":"Resolve Baseline"}</button>
    {open&&<BaselineDialog periodId={periodId} inputId={inputId} name={name} onClose={()=>setOpen(false)} onSaved={onSaved}/>}
  </article>;
}
function BaselineDialog({periodId,inputId,name,onClose,onSaved}:{periodId:string;inputId:string;name:string;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [data,setData]=useState<CandidateResponse|null>(null);
  const [query,setQuery]=useState("");
  const [pool,setPool]=useState("");
  const [pools,setPools]=useState<Array<{id:number;code:string;name:string}>>([]);
  const [poolError,setPoolError]=useState("");
  useEffect(() => { let active=true; kpiPoolService.list().then(items => {if(active)setPools(items);}).catch(() => {if(active)setPoolError("No se pudo cargar la lista de pools. Puedes buscar por nombre en el campo de busqueda.");}); return () => {active=false;}; }, []);
  const [selected,setSelected]=useState("");
  const [value,setValue]=useState("");
  const [reason,setReason]=useState("");
  const [sourceReference,setSourceReference]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  async function search(page=1,poolFilter=pool) {
    setBusy(true);setError("");setSelected("");
    try {setData(await baselineApi.candidates(periodId,inputId,query,page,poolFilter));} catch(e){setError(e instanceof Error?e.message:"Unable to load historical Results.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{if(dialog.current?.showModal)dialog.current.showModal();else dialog.current?.setAttribute("open","");void search();},[]);
  async function save(manual:boolean) {
    if(!data||busy)return;
    setBusy(true);setError("");
    try {
      if(manual)await baselineApi.manual(periodId,inputId,data.baselineVersion,value,reason,sourceReference);
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
    <h3>MANUAL MATCH</h3>
    <p>Elige el pool y busca el KPI. Solo se muestran resultados cerrados compatibles con el periodo, la unidad y las entidades requeridas.</p>
    <label>Pool de referencia<select value={pool} disabled={busy} onChange={event => {setPool(event.target.value); void search(1,event.target.value);}}><option value="">Todos los pools</option>{pools.map(item => <option key={item.id} value={item.id}>{item.code} / {item.name}</option>)}</select></label>
    {poolError && <p role="alert">{poolError}</p>}
    <form onSubmit={e=>{e.preventDefault();void search();}}><label>Search historical Results<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="KPI, Pool, Scorecard or entity"/></label><button disabled={busy}>Search</button></form>
    <h3>Suggested Matches</h3>
    {busy&&<p role="status">Loading…</p>}
    {data&&!data.candidates.length&&<p>No eligible closed Results found. You can provide a manual baseline.</p>}
    {data?.candidates.map(c=><label className="baseline-candidate" key={c.id}><input type="radio" name="baseline-candidate" value={c.id} checked={selected===c.id} disabled={busy} onChange={()=>setSelected(c.id)}/><span><strong>{c.kpiCode} {c.kpiName}</strong><br/>{c.poolName} / {c.scorecardName} / {c.periodKey}{c.subjectLabel?` / ${c.subjectLabel}`:""}<br/>{c.value} {c.unit}</span></label>)}
    {data&&data.total>25&&<nav aria-label="Candidate pages"><button disabled={busy||data.page===1} onClick={()=>search(data.page-1)}>Previous</button><span>Page {data.page}</span><button disabled={busy||data.page*25>=data.total} onClick={()=>search(data.page+1)}>Next</button></nav>}
    <button className="entry-primary" disabled={busy||!selected} onClick={()=>save(false)}>Use Selected Baseline</button>
    <section><h3>Ingresar baseline</h3><p>Captura el resultado historico real, no la meta ni el cumplimiento. Overall usa un valor global; Contribute usa el total de las mismas entidades; Individual usa el valor de esta entidad. El periodo y la unidad requeridos se muestran arriba.</p><p>El baseline debe ser mayor que 0 para calcular una variacion porcentual.</p>
      <label>Baseline value<input inputMode="decimal" value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/></label>
      <label>Reason for manual entry<textarea maxLength={10000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} placeholder="Explain why a manual baseline is necessary (at least 10 characters)"/></label>
      <label>Source reference<textarea maxLength={10000} value={sourceReference} disabled={busy} onChange={e=>setSourceReference(e.target.value)} placeholder="Report, ledger or other reference for this value"/></label>
      <p>Manual baselines require exception approval. Their historical provenance and contributor composition cannot be verified automatically.</p>
      <button className="entry-primary" disabled={busy||!data||Number(value)<=0||!sourceReference.trim()||!/^\d{1,14}(\.\d{1,6})?$/.test(value)||reason.trim().length<10} onClick={()=>save(true)}>Save Manual Baseline</button>
    </section>
  </dialog>;
}

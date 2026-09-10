import { useQuery } from "@tanstack/react-query";
import { monitoringRequest } from "../monitoring-results/monitoring-results.service";

export type AuditEvent = { id:string; actionCode:string; fromStatusCode:string; toStatusCode:string; actorUserId:string|null; occurredAt:string; comment:string|null; metadata:unknown };
export type OfficialEvaluation = {
  id:string; configurationId:string; revisionId:string|null; code:string; name:string; configCode:string;
  entityId:string|null; entityLabel:string|null; evaluationKind:string; goal:string|null; goalUnit:string|null; unit:string|null;
  result:string|null; score:string|null; goalMet:boolean|null; trafficLight:string|null; weight:string; weightedContribution:string|null;
  dataSource:string|null; comment:string|null; historical:Record<string, any>|null; effectiveSettingsSnapshot:Record<string, any>|null;
  thresholds:unknown[]; baselines:unknown[]; revisions:unknown[]; inputValues:unknown;
};
export type OfficialResult = {
  id:string; scorecardId:string; monitoringPeriodId:string; code:string; name:string;
  departmentsSnapshot:Array<{id?:string;name?:string;departmentName?:string;departmentNameSnapshot?:string;employees?:Array<{name?:string;employeeNameSnapshot?:string}>}>|null;
  period:string; periodKey:string; periodStart:string; periodEnd:string; poolId:string; poolName:string; poolCode:string;
  frequency:string|null; frequencyCode:string|null; sequenceNo:number; status:"Closed"|"Closed with Exceptions";
  closedWithExceptions:boolean; closedAt:string|null; justification:string|null; closure:unknown;
  score:string|null; directScore:string|null; linkedScore:string|null; ownWeight:string; linkedWeight:string;
  calculationVersion:string|null; selectedEntryMethod:string|null; scoreStatus:string|null;
  evaluations:OfficialEvaluation[]; links:Array<{id:string;scorecardId:string;code:string;name:string;weight:string;score:string|null}>;
  check:{id:string;createdAt:string;calculationVersion:string;scoringSnapshot:unknown;issues:Array<{findingCode:string;message:string}>}|null;
  audit:AuditEvent[];
};
export const numberOrNull = (v: string | number | null | undefined):number|null => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
export const percent = (v: string | number | null | undefined, digits=2) => numberOrNull(v) === null ? "—" : `${Number(v).toFixed(digits)}%`;
export const difference = (a:string|number|null|undefined,b:string|number|null|undefined) => numberOrNull(a) === null || numberOrNull(b) === null ? null : Number(a)-Number(b);
export const averageOf = (values:Array<string|number|null|undefined>) => { const numbers=values.map(numberOrNull).filter((v):v is number=>v!==null); return numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:null; };
export const departmentNames = (r:OfficialResult) => (r.departmentsSnapshot ?? []).map(d=>d.name ?? d.departmentName ?? d.departmentNameSnapshot ?? "Unavailable");
export const resultLink = (r:Pick<OfficialResult,"id">) => `/app/reports/scorecard-result-detail?resultId=${encodeURIComponent(r.id)}`;
export const latestResults = (items:OfficialResult[]) => [...new Map([...items].sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd)||b.periodStart.localeCompare(a.periodStart)).map(r=>[r.scorecardId,r] as const).reverse()).values()].sort((a,b)=>a.code.localeCompare(b.code));
export function comparisonResult(items:OfficialResult[], r:OfficialResult, mode:string) {
  const candidates=items.filter(c=>c.scorecardId===r.scorecardId && c.poolId===r.poolId && c.frequencyCode===r.frequencyCode);
  if(mode==="Previous Period") return candidates.find(c=>c.sequenceNo===r.sequenceNo-1);
  if(mode==="Same Period Last Year") return candidates.find(c=>Number(c.periodStart.slice(0,4))===Number(r.periodStart.slice(0,4))-1 && c.periodStart.slice(4)===r.periodStart.slice(4) && c.periodEnd.slice(5,7)===r.periodEnd.slice(5,7));
  return candidates.find(c=>c.periodKey===mode);
}
const empty:OfficialResult[]=[];
async function loadAll() {
  const items:OfficialResult[]=[]; let cursor:string|null=null;
  do { const page: {contractVersion:string;items:OfficialResult[];nextCursor:string|null}=await monitoringRequest<{contractVersion:string;items:OfficialResult[];nextCursor:string|null}>("/v1/closed-results"+(cursor?"?after="+cursor:"")); items.push(...page.items); cursor=page.nextCursor; } while(cursor);
  return items;
}
export function useOfficialResults() {
  const query=useQuery({queryKey:["official-closed-results"],queryFn:loadAll,staleTime:30000});
  return {...query,items:query.data ?? empty};
}
export function ReportLoadState({query}:{query:{isLoading:boolean;isError:boolean;error:Error|null;refetch:()=>unknown}}) {
  return query.isLoading?<p role="status">Loading official closed results…</p>:query.isError?<p role="alert">{query.error?.message} <button onClick={()=>void query.refetch()}>Retry</button></p>:null;
}
export function OfficialAudit({events}:{events:AuditEvent[]}) {
  return <details className="check-results-review"><summary>Period audit ({events.length})</summary><table><thead><tr><th>Action</th><th>When</th><th>Actor</th><th>Reason</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{e.actionCode}</td><td>{new Date(e.occurredAt).toLocaleString()}</td><td>{e.actorUserId ?? "—"}</td><td>{e.comment ?? "—"}</td></tr>)}</tbody></table></details>;
}
export function OfficialTraffic({value}:{value:string|null}) { const css=value==="GREEN"?"excellent":value==="YELLOW"?"warning":value==="RED"?"danger":"unavailable"; return <span className={`detail-traffic ${css}`}><i/>{value ?? "—"}</span>; }

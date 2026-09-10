import { useOfficialResults, ReportLoadState, OfficialAudit } from "../reports/official-results";
export function ClosedPeriodAudit({periodId}:{periodId:string}) {
  const query=useOfficialResults();
  const result=query.items.find(r=>r.monitoringPeriodId===periodId);
  return <><ReportLoadState query={query}/>{result && <OfficialAudit events={result.audit}/>}</>;
}

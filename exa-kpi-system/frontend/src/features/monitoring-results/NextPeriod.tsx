import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { MonitoringApiError, monitoringRequest } from "./monitoring-results.service";

const stages: Record<string,string> = { WAITING_FOR_PREVIOUS_CLOSE:"Waiting for previous close confirmation", POOL_COMPOSITION_PENDING:"Pool composition pending", POOL_COMPOSITION_READY:"Pool composition ready", SCORECARDS_PREPARED:"Scorecards prepared", MONITORING_MATERIALIZED:"Monitoring materialized", END_OF_SCHEDULE:"End of Pool schedule" };
type NextPeriodResponse = { stage?: string; availability: string; reason: string | null; poolId: string; inputPeriod: { poolPeriodId: string | null; periodKey: string } | null; monitoringPeriod: { id: string } | null };
export function NextPeriod({ periodId }: { periodId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resumeStage, setResumeStage] = useState<string|null>(null);
  const query = useQuery({ queryKey: ["monitoring-next-period", periodId], queryFn: () => monitoringRequest<NextPeriodResponse>(`/v1/monitoring-periods/${periodId}/next-period`), retry: false });
  const target = query.data;
  return <section className="check-results-review" aria-label="Next Period"><h2>Next Period</h2>
    {query.isLoading && <p>Loading next Input Period…</p>}
    {query.isError && <p role="alert">{query.error.message}</p>}
    {(resumeStage || target?.stage) && <p role="status">{stages[resumeStage ?? target!.stage!] ?? resumeStage ?? target?.stage}</p>}
    {target && <><p>{target.inputPeriod?.periodKey}</p><p>{target.reason}</p>
      {target.monitoringPeriod ? <Link className="entry-primary" to={`/app/monitoring-results/result-entry?monitoringPeriodId=${target.monitoringPeriod.id}`}>Open Next Period</Link> : target.inputPeriod?.poolPeriodId && <><p>Inherit Scorecards, KPI selections and weights, resolve the next period settings and start with empty Results.</p><button className="entry-primary" disabled={busy} onClick={async () => {
        if (!target.inputPeriod?.poolPeriodId) return;
        setBusy(true); setError(""); setResumeStage(null);
        try { const created = await monitoringRequest<{id: string}>(`/v1/monitoring-periods/${periodId}/next-period`, { method: "POST" }); navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${created.id}`); }
        catch (cause) { const details=cause instanceof MonitoringApiError ? cause.details as {stage?:string;retryable?:boolean}|undefined : undefined; setResumeStage(details?.stage ?? null); setError((cause instanceof Error ? cause.message : "Next Period could not be initialized.") + (details?.retryable ? " Retry Initialize Next Period to resume completed steps." : "")); }
        finally { setBusy(false); }
      }}>{busy ? "Initializing…" : "Initialize Next Period"}</button></>}
    </>}
    {error && <p role="alert">{error}</p>}
    <button className="entry-secondary" disabled={busy || query.isFetching} onClick={() => {setResumeStage(null);void query.refetch();}}>Refresh Next Period</button>
  </section>;
}

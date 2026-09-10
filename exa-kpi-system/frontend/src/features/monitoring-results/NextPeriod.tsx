import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { monitoringRequest } from "./monitoring-results.service";

type NextPeriodResponse = { stage: string; reason?: string | null; poolId: string; inputPeriod: { poolPeriodId: string | null; periodKey: string; start: string } | null; monitoringPeriod: { id: string } | null; scorecards: Array<{id:string;code:string;name:string;status:string}>; removedKpis?:Array<{configurationId:string;scorecardId:string;code:string;name:string}> };
export function NextPeriod({ periodId }: { periodId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState<NonNullable<NextPeriodResponse["removedKpis"]>>([]);
  const path = "/v1/monitoring-periods/" + periodId + "/next-period";
  const query = useQuery({ queryKey: ["monitoring-next-period", periodId], queryFn: () => monitoringRequest<NextPeriodResponse>(path), retry: false });
  const target = query.data;
  async function act(prepare: boolean) {
    setBusy(true); setError("");
    try {
      if (prepare) { const result = await monitoringRequest<NextPeriodResponse>(path + "/prepare-scorecards", {method:"POST"}); setRemoved(result.removedKpis ?? []); await query.refetch(); }
      else { const result = await monitoringRequest<{id:string}>(path, {method:"POST"}); navigate("/app/monitoring-results/result-entry?monitoringPeriodId=" + result.id); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Next Period could not be prepared"); }
    finally { setBusy(false); }
  }
  return <section className="check-results-review" aria-label="Next Period"><h2>Prepare Next Period</h2>
    <p>Review Pool → Finalize Pool → Review Scorecards → Finalize Scorecards → Monitoring Draft</p>
    {query.isLoading && <p>Loading next period…</p>}{query.isError && <p role="alert">{query.error.message}</p>}
    {target && <><h3>{target.inputPeriod?.periodKey}</h3><p>{target.reason}</p>
      {target.monitoringPeriod ? <Link className="entry-primary" to={"/app/monitoring-results/result-entry?monitoringPeriodId=" + target.monitoringPeriod.id}>Open Next Period</Link> : target.inputPeriod && <>
        <Link className="entry-secondary" to={"/app/pool-kpis/manage-kpis?poolId=" + target.poolId + "&period=" + encodeURIComponent(target.inputPeriod.start)}>Review Pool in Manage KPIs</Link>
        <Link className="entry-secondary" to={"/app/pool-kpis/period-schedule?poolId=" + target.poolId + "&period=" + encodeURIComponent(target.inputPeriod.start)}>Pool Schedule / Finalize Pool</Link>
        {target.stage === "SCORECARDS_REVIEW" && <><p>Pool finalized. Inherit applicable selections and weights as editable drafts. Review removed KPIs and adjust weights before finalizing each Scorecard.</p><button className="entry-primary" disabled={busy} onClick={() => act(true)}>Prepare Scorecard Drafts</button></>}
        {target.scorecards.map(card => <p key={card.id}><Link to={"/app/scorecards/detail?scorecardId=" + card.id + "&periodKey=" + encodeURIComponent(target.inputPeriod!.periodKey)}>{card.code} · {card.name}</Link> · {card.status}</p>)}
        <button className="entry-primary" disabled={busy || target.stage !== "READY_TO_MATERIALIZE"} onClick={() => act(false)}>Initialize Monitoring Draft</button>
        <p>New KPIs remain available for selection. Results, scores, checks and baselines start empty.</p>
      </>}
    </>}
    {removed.length > 0 && <aside><h3>Not inherited: removed from the new Pool</h3><ul>{removed.map(kpi => <li key={kpi.scorecardId + ":" + kpi.configurationId}>{kpi.code} · {kpi.name}</li>)}</ul></aside>}
    {error && <p role="alert">{error}</p>}<button className="entry-secondary" disabled={busy || query.isFetching} onClick={() => void query.refetch()}>Refresh Readiness</button>
  </section>;
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { initializeMonitoringPeriod, monitoringRequest } from "./monitoring-results.service";

type NextPeriodResponse = { availability: string; reason: string | null; poolId: string; inputPeriod: { poolPeriodId: string | null; periodKey: string } | null; monitoringPeriod: { id: string } | null };
export function NextPeriod({ periodId }: { periodId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["monitoring-next-period", periodId], queryFn: () => monitoringRequest<NextPeriodResponse>(`/v1/monitoring-periods/${periodId}/next-period`), retry: false });
  const target = query.data;
  return <section className="check-results-review" aria-label="Next Period"><h2>Next Period</h2>
    {query.isLoading && <p>Loading next Input Period…</p>}
    {query.isError && <p role="alert">{query.error.message}</p>}
    {target && <><p>{target.inputPeriod?.periodKey}</p><p>{target.reason}</p>
      {target.monitoringPeriod ? <Link className="entry-primary" to={`/app/monitoring-results/result-entry?monitoringPeriodId=${target.monitoringPeriod.id}`}>Open Next Period</Link> : target.availability === "READY_TO_MATERIALIZE" && <><p>Initialize this period from its finalized Scorecards. Results start empty.</p><button className="entry-primary" disabled={busy} onClick={async () => {
        if (!target.inputPeriod?.poolPeriodId) return;
        setBusy(true); setError("");
        try { const created = await initializeMonitoringPeriod(target.poolId, target.inputPeriod.poolPeriodId); navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${created.id}`); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Next Period could not be initialized."); }
        finally { setBusy(false); }
      }}>{busy ? "Initializing…" : "Initialize Next Period"}</button></>}
    </>}
    {error && <p role="alert">{error}</p>}
    <button className="entry-secondary" disabled={busy || query.isFetching} onClick={() => void query.refetch()}>Refresh Next Period</button>
  </section>;
}

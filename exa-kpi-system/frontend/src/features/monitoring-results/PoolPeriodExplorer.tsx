import { periodDisplay } from "./period-display";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { initializeMonitoringPeriod, monitoringReadService } from "./monitoring-results.service";
import "./manual-result-entry.css";

function PoolCalendar({ pool, destination }: { pool: { id: number; code: string; name: string }; destination: "result-entry" | "detail" }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const schedule = useQuery({ queryKey: ["monitoring-schedule", String(pool.id), "explorer"], queryFn: () => monitoringReadService.inputSchedule(String(pool.id), { pageSize: 100, sortBy: "periodStart", sortOrder: "asc" }), retry: false });
  const readiness = useQuery({ queryKey: ["monitoring-period-resolver", String(pool.id), selected], queryFn: () => monitoringReadService.resolve(String(pool.id), selected!), enabled: !!selected, retry: false });
  const calendar = useQuery({ queryKey: ["kpi-pool-periods", pool.id], queryFn: () => kpiPoolService.getInputPeriods(pool.id) });
  const displayLabel = (period: any) => calendar.data?.data.length ? periodDisplay({ start: period.periodStart ?? period.start, end: period.periodEnd ?? period.end }, calendar.data.data).label : period.periodKey;
  const resolved = readiness.data;
  return <article className="pool-calendar"><header><div><small>{pool.code}</small><h3>{pool.name}</h3></div><Link to={`/app/monitoring-results/pool-input-schedule?poolId=${pool.id}`}>Full schedule</Link></header>
    {schedule.isLoading && <p>Loading Input Periods…</p>}
    {schedule.isError && <p role="alert">{schedule.error.message} <button onClick={() => void schedule.refetch()}>Retry</button></p>}
    <div className="pool-calendar-periods">{schedule.data?.data.map((period: any) => <button key={period.periodKey} aria-pressed={selected === period.poolInputPeriodId} className={period.monitoringPeriod ? "initialized" : ""} onClick={() => {
      setError("");
      if (period.monitoringPeriod) navigate(`/app/monitoring-results/${destination}?monitoringPeriodId=${period.monitoringPeriod.id}`);
      else if (period.poolInputPeriodId) setSelected(period.poolInputPeriodId);
      else setError(`${period.periodKey}: configure the Input Period in KPI Pool first.`);
    }}><strong>{displayLabel(period)}</strong><span>{period.monitoringPeriod ? period.status.replaceAll("_", " ") : period.poolWorkflowStatus === "FINALIZED" ? "Check availability" : period.poolWorkflowStatus === "FUTURE" ? "Future period" : "Awaiting Pool finalization"}</span><small>{period.monitoringPeriod ? `${period.entered}/${period.expected} Results` : "Not initialized"}</small></button>)}</div>
    {schedule.data && !schedule.data.data.length && <p>No Input Periods configured.</p>}
    {selected && <div className="pool-calendar-readiness" aria-live="polite">{readiness.isFetching ? <p>Checking Pool and Scorecard readiness…</p> : readiness.isError ? <p role="alert">{readiness.error.message}</p> : resolved && <><strong>{resolved.inputPeriod && displayLabel(resolved.inputPeriod)}</strong><p>{resolved.reason ?? "Monitoring is available for this period."}</p>
      {resolved.monitoringPeriod ? <Link to={`/app/monitoring-results/${destination}?monitoringPeriodId=${resolved.monitoringPeriod.id}`}>Open period</Link> : resolved.availability === "READY_TO_MATERIALIZE" ? <button className="entry-primary" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { const created = await initializeMonitoringPeriod(String(pool.id), selected); navigate(`/app/monitoring-results/${destination}?monitoringPeriodId=${created.id}`); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Period could not be initialized."); }
        finally { setBusy(false); }
      }}>{busy ? "Initializing…" : "Initialize Monitoring Period"}</button> : <p>Finalize the required Pool and Scorecard compositions before entering Results.</p>}
    </>}</div>}
    {error && <p role="alert">{error}</p>}
  </article>;
}

export function PoolPeriodExplorer({ destination = "result-entry" }: { destination?: "result-entry" | "detail" }) {
  const [search, setSearch] = useState("");
  const pools = useQuery({ queryKey: ["monitoring-pool-options"], queryFn: () => kpiPoolService.list(), retry: false });
  const visible = pools.data?.filter(pool => `${pool.code} ${pool.name} ${pool.companies.join(" ")}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) ?? [];
  return <section className="pool-period-explorer" aria-label="All Pools and Input Periods"><header><div><h2>Pools & Input Periods</h2><p>Browse every Pool calendar. Select a period to open Results or check what is required to initialize it.</p></div><label>Find Pool<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Pool code, name or company"/></label></header>
    {pools.isLoading && <p>Loading Pools…</p>}{pools.isError && <p role="alert">{pools.error.message} <button onClick={() => void pools.refetch()}>Retry</button></p>}
    {pools.data && <p>{visible.length} of {pools.data.length} Pools</p>}
    {visible.map(pool => <PoolCalendar key={pool.id} pool={pool} destination={destination}/>)}
    {pools.data && !visible.length && <p>No Pools match your search.</p>}
  </section>;
}

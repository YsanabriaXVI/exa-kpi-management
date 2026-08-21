import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, CalendarRange, CheckCircle2, Clock3, Layers3, ListChecks, PencilLine, TriangleAlert } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import type { PoolInputPeriod } from "./kpi-pool.types";
import { PoolPeriodSelect } from "./PoolPeriodSelect";
import { scorecardService } from "../scorecards/scorecard.service";
import "./kpi-pool.css";
import "./period-workflow.css";
import "./pool-period-schedule.css";

export function PoolPeriodSchedule() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const poolId = Number(params.get("poolId")) || 0;
  const [selectedStart, setSelectedStart] = useState("");
  const poolQuery = useQuery({ queryKey: ["kpi-pool", poolId], queryFn: () => kpiPoolService.get(poolId), enabled: poolId > 0 });
  const periodsQuery = useQuery({ queryKey: ["kpi-pool-periods", poolId], queryFn: () => kpiPoolService.getInputPeriods(poolId), enabled: poolId > 0 });
  const periods = periodsQuery.data?.data ?? [];
  useEffect(() => {
    if (!selectedStart && periods.length) {
      setSelectedStart(periods.find((period) => isTodayWithin(period.start, period.end))?.start ?? periodsQuery.data?.meta.defaultPeriodStart ?? periods[0].start);
    }
  }, [periods, periodsQuery.data?.meta.defaultPeriodStart, selectedStart]);
  const selected = periods.find((period) => period.start === selectedStart);
  const compositionQuery = useQuery({
    queryKey: ["kpi-pool-composition", poolId, selectedStart],
    queryFn: () => kpiPoolService.getComposition(poolId, selectedStart),
    enabled: poolId > 0 && Boolean(selectedStart) && selected?.workflowStatus !== "FUTURE",
  });
  const compositionCount = compositionQuery.data?.length ?? 0;
  const scorecardWorkflowQuery = useQuery({ queryKey: ["scorecard-pool-workflow", poolId, selected?.start], queryFn: () => scorecardService.poolWorkflow(poolId, selected!.start.slice(0, 7)), enabled: poolId > 0 && selected?.workflowStatus === "FINALIZED", retry: false });
  const editable = periods.find((period) => period.workflowStatus === "EDITABLE");

  if (!poolId) return <ScheduleEmpty onBack={() => navigate("/app/pool-kpis/overview")} />;
  if (poolQuery.isLoading || periodsQuery.isLoading) return <main className="pool-page"><div className="pool-loading">Loading Pool Period Schedule...</div></main>;
  if (!poolQuery.data || !selected) return <ScheduleEmpty onBack={() => navigate("/app/pool-kpis/overview")} />;
  const pool = poolQuery.data;

  return <main className="pool-page pool-period-schedule-page">
    <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/pool-kpis/overview">KPI Pool</Link><span>/</span><Link to={`/app/pool-kpis/period-schedule?poolId=${poolId}`} aria-current="page">Pool Period Schedule</Link></nav>
    <header className="pool-page-header"><div><h1>Pool Period Schedule</h1><p>Review each Input Period across Pool Composition, Scorecard KPI Selection and Monitoring Results.</p></div></header>

    <section className="schedule-pool-context" aria-label="KPI Pool context">
      <div><span>KPI Pool</span><strong>{pool.code} <i aria-hidden="true">·</i> {pool.name}</strong></div>
      <dl><div><dt>Pool Validity</dt><dd>{formatRange(pool.validFrom, pool.validTo)}</dd></div><div><dt>Frequency</dt><dd>{pool.frequency}</dd></div></dl>
    </section>

    <section className="schedule-period-navigation">
      <div className="schedule-period-selector"><label>Input Period</label><PoolPeriodSelect periods={periods} value={selectedStart} onChange={setSelectedStart}/></div>
    </section>

    <SelectedPeriodStatusCard period={selected} editable={editable} onManage={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${poolId}`)}/>

    <section className="input-period-workflow" aria-labelledby="input-period-workflow-title"><header><h2 id="input-period-workflow-title">Input Period Workflow Status — {formatPeriod(selected.start)}</h2><p>Track how this Input Period moves through Pool Composition, Scorecard KPI Selection and Monitoring Results.</p></header><div className={`period-workflow-board ${selected.workflowStatus.toLowerCase()}`}>
      <StageCard step={1} title="Pool Composition" state={poolStageState(selected)} icon={<Layers3 size={20}/>}>
        {selected.workflowStatus === "FINALIZED" ? <><strong>{compositionCount} KPI {compositionCount === 1 ? "Configuration" : "Configurations"}</strong><p>Read-only set available to Scorecards for this Input Period.</p><button className="button secondary" onClick={() => navigate(`/app/pool-kpis/detail/${poolId}?period=${selected.start}`)}>View Composition</button></> : selected.workflowStatus === "EDITABLE" ? <><strong>You may continue preparing this composition.</strong><p>{compositionCount} KPI {compositionCount === 1 ? "Configuration is" : "Configurations are"} currently included. {selected.canFinalizeComposition ? "The composition can be finalized when ready." : finalizationReason(selected)}</p><button className="button primary" onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${poolId}`)}>Manage Composition</button></> : <><strong>Not available yet</strong><p>This stage is not available for this Input Period yet.</p></>}
      </StageCard>
      <ArrowRight className="workflow-stage-arrow" aria-hidden="true"/>
      <StageCard step={2} title="Scorecard KPI Selection" state={scorecardStageState(selected, scorecardWorkflowQuery.data?.status)} icon={<ListChecks size={20}/> }>
        {selected.workflowStatus === "FINALIZED" ? scorecardWorkflowQuery.isError ? <><strong>Integration temporarily unavailable</strong><p>The Scorecards contract could not be reached. No workflow state has been inferred.</p></> : scorecardWorkflowQuery.data ? <><strong>{scorecardWorkflowQuery.data.totalScorecards} applicable Scorecard{scorecardWorkflowQuery.data.totalScorecards === 1 ? "" : "s"}</strong><p>{scorecardWorkflowQuery.data.finalized} finalized · {scorecardWorkflowQuery.data.preparing} in preparation · {scorecardWorkflowQuery.data.pending} not started.</p><button className="button secondary" onClick={() => navigate("/app/scorecards/overview")}>Open Scorecards</button></> : <><strong>Loading Scorecard workflow</strong><p>Reading the real Scorecards contract for this Input Period.</p></> : selected.workflowStatus === "EDITABLE" ? <><strong>Waiting for Pool Composition</strong><p>This stage becomes available after Pool Composition is finalized.</p></> : <><strong>Not available yet</strong><p>This stage is not available for this Input Period yet.</p></>}
      </StageCard>
      <ArrowRight className="workflow-stage-arrow" aria-hidden="true"/>
      <StageCard step={3} title="Monitoring Results" state={downstreamStageState(selected)} icon={<Activity size={20}/>}>
        {selected.workflowStatus === "FINALIZED" ? <><strong>Integration pending</strong><p>Monitoring workflow status will appear when the Monitoring service is connected.</p><button className="button secondary" onClick={() => navigate("/app/monitoring-results/overview")}>View Monitoring</button></> : selected.workflowStatus === "EDITABLE" ? <><strong>Waiting for previous stages</strong><p>Monitoring becomes available after Pool Composition and Scorecard KPI Selection are complete.</p></> : <><strong>Not available yet</strong><p>This stage is not available for this Input Period yet.</p></>}
      </StageCard>
    </div></section>
    <p className="schedule-contract-note">Monitoring expected inputs are determined by the KPI Configurations selected by applicable Scorecards—not by every KPI Configuration in the Pool.</p>
  </main>;
}

function StageCard({ step, title, state, icon, children }: { step: number; title: string; state: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <article className={`workflow-stage-card ${state.toLowerCase().replace(/ /g, "-")}`}><header><span className="workflow-stage-icon">{icon}</span><span className="workflow-stage-number" aria-hidden="true">{step}</span><h2>{title}</h2></header><b className="workflow-stage-status">{state}</b><div className="workflow-stage-content">{children}</div></article>;
}

function SelectedPeriodStatusCard({ period, editable, onManage }: { period: PoolInputPeriod; editable?: PoolInputPeriod; onManage: () => void }) {
  const periodLabel = formatPeriod(period.start);
  if (period.workflowStatus === "FINALIZED") return <section className="selected-period-status-card finalized" aria-live="polite"><span className="selected-period-status-icon"><CheckCircle2 size={24}/></span><div className="selected-period-status-copy"><header><span>{periodLabel}</span><b>Finalized</b></header><h2>Pool Composition Finalized</h2><p>The KPI Configuration set for this Input Period is read-only and available to Scorecards.</p><p>Scorecards can select the KPIs they require from this finalized composition.</p><small>Scorecard and Monitoring workflow status will appear when their services are connected.</small></div></section>;
  if (period.workflowStatus === "FUTURE") return <section className="selected-period-status-card future" aria-live="polite"><span className="selected-period-status-icon"><Clock3 size={24}/></span><div className="selected-period-status-copy"><header><span>{periodLabel}</span><b>Future</b></header><h2>KPI composition not available yet</h2><p>Complete the previous period workflow before this composition becomes available.</p><strong>Current editable composition: {editable ? formatPeriod(editable.start) : "None available"}</strong></div></section>;
  if (period.canFinalizeComposition) return <section className="selected-period-status-card ready" aria-live="polite"><span className="selected-period-status-icon"><CheckCircle2 size={24}/></span><div className="selected-period-status-copy"><header><span>{periodLabel}</span><b>Ready to Finalize</b></header><h2>Pool Composition Ready</h2><p>The previous Input Period dependency has been satisfied. Review the KPI Configuration set and finalize this composition when ready.</p><button className="button primary" onClick={onManage}>Manage Composition</button></div></section>;
  return <section className="selected-period-status-card preparing" aria-live="polite"><span className="selected-period-status-icon"><PencilLine size={24}/></span><div className="selected-period-status-copy"><header><span>{periodLabel}</span><b>Preparing</b></header><h2>Pool Composition in Preparation</h2><p>You may add, remove or replace KPI Configurations for this Input Period.</p>{period.dependency.previousPeriodStart && <small className="selected-period-dependency"><TriangleAlert size={14}/> Finalization is waiting for {formatPeriod(period.dependency.previousPeriodStart)} Monitoring to close.</small>}<button className="button primary" onClick={onManage}>Manage {formatPeriodMonth(period.start)} KPIs</button></div></section>;
}

function ScheduleEmpty({ onBack }: { onBack: () => void }) { return <main className="pool-page"><section className="detail-empty-state"><CalendarRange size={32}/><h1>No KPI Pool selected</h1><p>Open Period Schedule from a KPI Pool in the Overview.</p><button className="button secondary" onClick={onBack}>Back to Overview</button></section></main>; }
function poolStageState(period: PoolInputPeriod) { return period.workflowStatus === "FINALIZED" ? "FINALIZED" : period.workflowStatus === "FUTURE" ? "FUTURE" : period.canFinalizeComposition ? "READY TO FINALIZE" : "IN PREPARATION"; }
function downstreamStageState(period: PoolInputPeriod) { return period.workflowStatus === "FINALIZED" ? "INTEGRATION PENDING" : period.workflowStatus === "EDITABLE" ? "WAITING" : "FUTURE"; }
function scorecardStageState(period: PoolInputPeriod, state?: "NOT_STARTED" | "IN_PROGRESS" | "FINALIZED") { if (period.workflowStatus !== "FINALIZED") return period.workflowStatus === "EDITABLE" ? "WAITING" : "FUTURE"; return state === "FINALIZED" ? "FINALIZED" : state === "IN_PROGRESS" ? "IN PREPARATION" : state === "NOT_STARTED" ? "AVAILABLE" : "INTEGRATION PENDING"; }
function finalizationReason(period: PoolInputPeriod) { return period.dependency.previousPeriodStart ? `May be prepared now. Waiting for ${formatPeriod(period.dependency.previousPeriodStart)} Monitoring to close before finalization.` : "May be prepared now."; }
function formatPeriod(value: string) { return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value)); }
function formatPeriodMonth(value: string) { return new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(value)); }
function formatRange(start: string, end: string) { return `${formatPeriod(start)} – ${formatPeriod(end)}`; }
function isTodayWithin(start: string, end: string) { const today = new Date().toISOString().slice(0, 10); return start <= today && today <= end; }

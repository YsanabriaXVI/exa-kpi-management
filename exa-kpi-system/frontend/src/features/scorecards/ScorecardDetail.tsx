import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Link2, Target, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { scorecardService } from "./scorecard.service";
import "./scorecards.css";

export function ScorecardDetail() {
  const [params] = useSearchParams(); const id = Number(params.get("scorecardId") ?? 0); const [periodKey, setPeriodKey] = useState("");
  const scorecard = useQuery({ queryKey: ["scorecard", id], queryFn: () => scorecardService.getById(id), enabled: id > 0 });
  const periods = useQuery({ queryKey: ["scorecard-periods", id], queryFn: () => scorecardService.periods(id), enabled: id > 0 });
  useEffect(() => { if (!periodKey && periods.data?.length) setPeriodKey(periods.data[0].periodKey); }, [periodKey, periods.data]);
  const period = periods.data?.find((row) => row.periodKey === periodKey);
  const composition = useQuery({ queryKey: ["scorecard-composition", id, periodKey], queryFn: () => scorecardService.composition(id, periodKey), enabled: id > 0 && Boolean(periodKey) && period?.scorecardCompositionStatus !== "UNAVAILABLE", retry: false });
  if (scorecard.isLoading) return <main className="scorecard-page"><p>Loading Scorecard...</p></main>;
  if (scorecard.isError || periods.isError) return <main className="scorecard-page"><section className="scorecard-empty-state"><h1>Scorecard details could not be loaded</h1><p>{((scorecard.error ?? periods.error) as Error).message}</p><Link className="primary-button" to="/app/scorecards/overview">Back to Scorecard Overview</Link></section></main>;
  if (!scorecard.data) return <main className="scorecard-page"><h1>Scorecard not found</h1></main>;
  const item = scorecard.data;
  return <main className="scorecard-page"><nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span>Details</span></nav>
    <header className="scorecard-page-header"><div><h1>{item.name}</h1><p>{item.code} · {item.status}</p></div><Link className="primary-button" to={`/app/scorecards/assignment?scorecardId=${id}`}>Open Assignment</Link></header>
    <section className="scorecard-summary-grid"><article><Target size={18}/><small>KPI Pool Source</small><strong>{item.poolSource}</strong></article><article><UsersRound size={18}/><small>Scope</small><strong>{item.departments.join(", ") || "No departments"}</strong><span>{item.collaborators} collaborators</span></article><article><CalendarDays size={18}/><small>Input Period</small><select value={periodKey} onChange={(event) => setPeriodKey(event.target.value)}>{periods.data?.map((row) => <option value={row.periodKey} key={row.periodKey}>{row.periodKey} · {row.scorecardCompositionStatus}</option>)}</select></article></section>
    {period?.scorecardCompositionStatus === "UNAVAILABLE" ? <section className="scorecard-empty-state"><h2>Composition unavailable</h2><p>The source Pool Composition has not been finalized for this Input Period.</p></section> : <section className="assignment-composition-section"><header><div><h2>Composition Snapshot — {periodKey}</h2><p>{composition.data?.status === "FINALIZED" ? "Read-only finalized Scorecard Composition." : "Composition currently in preparation."}</p></div></header><div className="table-wrap"><table className="kpi-table"><thead><tr><th>KPI Configuration</th><th>Weight</th></tr></thead><tbody>{composition.data?.kpis.map((row) => <tr key={row.id}><td><strong>{row.definitionCode} · {row.configurationCode}</strong><small>{row.definitionName}</small></td><td>{row.weight}%</td></tr>)}{!composition.data?.kpis.length && <tr><td colSpan={2}>No KPI Configurations selected.</td></tr>}</tbody></table></div><h3><Link2 size={16}/> Linked Scorecards</h3>{composition.data?.linkedScorecards.map((row) => <p key={row.id}>{row.code} · {row.name} — {row.weight}%</p>)}</section>}
  </main>;
}

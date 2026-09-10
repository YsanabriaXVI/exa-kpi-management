import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ArrowLeft, Check, Layers3, Link2, Target, UsersRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useOfficialResults, ReportLoadState, OfficialAudit, OfficialTraffic, percent, points, numberOrNull, latestResults, resultLink, type OfficialEvaluation, type OfficialResult } from "./official-results";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./reports.css";
import "./scorecard-result-detail.css";
import "./scorecard-result-detail-polish.css";

type CompositionView = "detailed" | "relative";
type ResultTab = "full" | "kpis" | "linked";

export function ScorecardResultDetail() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedCode = params.get("scorecardCode");
  const openedFrom = params.get("from");
  const query = useOfficialResults();
  const selectedResultId = params.get("resultId") ?? "";
  const [compositionView, setCompositionView] = useState<CompositionView>("detailed");
  const [tab, setTab] = useState<ResultTab>("full");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(0);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [scopePosition, setScopePosition] = useState({ x: 0, y: 0 });
  const scopeDrag = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(null);
  const scorecard = selectedResultId ? query.items.find(r=>r.id===selectedResultId) : latestResults(query.items).find(r=>r.code===selectedCode);
  const period = scorecard?.period ?? "—";
  const periods = query.items.filter(r=>r.scorecardId===scorecard?.scorecardId).sort((a,b)=>b.periodStart.localeCompare(a.periodStart));
  const reportKpis = scorecard?.evaluations ?? [];
  const linkedReportScorecards = scorecard?.links ?? [];

  const scope = useMemo(() => (scorecard?.departmentsSnapshot ?? []).map(d => ({name:d.name ?? d.departmentName ?? d.departmentNameSnapshot ?? "Unavailable", collaborators:(d.employees ?? []).map(e=>e.name ?? e.employeeNameSnapshot ?? "Unavailable")})), [scorecard]);
  const collaboratorCount = scope.reduce((total, department) => total + department.collaborators.length, 0);
  const backTarget = openedFrom === "history"
    ? { path: "/app/reports/scorecard-results-history", label: "Back to ScoreCard Results History" }
    : openedFrom === "analysis"
      ? { path: "/app/reports/analysis/scorecard-analysis", label: "Back to ScoreCard Analysis" }
      : openedFrom === "overview"
        ? { path: "/app/reports/latest-scorecard-results", label: "Back to Latest ScoreCard Results" }
        : { path: "/app/scorecards/overview", label: "Back to ScoreCard Overview" };

  if (!scorecard) return <main className="reports-page report-detail-page"><nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><span>ScoreCard Result Detail</span></nav><ReportLoadState query={query}/><section className="report-detail-empty"><h1>No official closed result selected</h1><p>Open a ScoreCard from Overview to view its result.</p><button onClick={() => navigate("/app/scorecards/overview")}><ArrowLeft size={16} />Back to ScoreCard Overview</button></section></main>;

  const targetKpi = Number(scorecard.ownWeight);
  const targetLinked = Number(scorecard.linkedWeight);
  const achievedKpi = numberOrNull(scorecard.directScore);
  const achievedLinked = numberOrNull(scorecard.linkedScore);
  const finalResult = numberOrNull(scorecard.score);
  const gap = finalResult === null ? null : Math.max(0,100-finalResult);
  const relativeColor = "#2383b8";
  const resultState = {kind:"neutral",label:scorecard.status,icon:<Check size={20}/>};
  const slices = [
    { id: "kpi", value: achievedKpi ?? 0, offset: 0, color: "#7650a0", tooltipLabel: "Own KPI Contribution:", tooltipValue: `${percent(achievedKpi)}`, tooltipDetail: `Target KPI Weight: ${targetKpi}%` },
    { id: "linked", value: achievedLinked ?? 0, offset: achievedKpi ?? 0, color: "#2383b8", tooltipLabel: "Linked ScoreCards Contribution:", tooltipValue: `${percent(achievedLinked)}`, tooltipDetail: `Target Linked Weight: ${targetLinked}%` },
    { id: "gap", value: gap ?? 0, offset: finalResult ?? 0, color: "#9aa6b2", tooltipLabel: "Gap to 100%:", tooltipValue: `${percent(gap)}`, tooltipDetail: "Difference between the obtained result and 100%" },
  ];
  const relativeSlices = [
    { id: "result", value: finalResult ?? 0, offset: 0, color: relativeColor, tooltipLabel: "Final ScoreCard Result:", tooltipValue: `${percent(finalResult)}`, tooltipDetail: `Performance status: ${resultState.label}` },
    { id: "relative-gap", value: gap ?? 0, offset: finalResult ?? 0, color: "#9aa6b2", tooltipLabel: "Gap to 100%:", tooltipValue: `${percent(gap)}`, tooltipDetail: "Difference between the Final ScoreCard Result and 100%" },
  ];
  const displayedSlices = compositionView === "detailed" && achievedKpi !== null && achievedLinked !== null ? slices : relativeSlices;
  const activeSlice = displayedSlices.find((slice) => slice.id === (hoveredSlice ?? selectedSlice));
  const startScopeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    scopeDrag.current = { pointerX: event.clientX, pointerY: event.clientY, originX: scopePosition.x, originY: scopePosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveScopeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!scopeDrag.current) return;
    setScopePosition({ x: scopeDrag.current.originX + event.clientX - scopeDrag.current.pointerX, y: scopeDrag.current.originY + event.clientY - scopeDrag.current.pointerY });
  };
  const stopScopeDrag = () => { scopeDrag.current = null; };

  return <main className="reports-page report-detail-page result-detail-refresh">
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards">ScoreCards</Link><span>/</span><Link to="/app/scorecards/overview">ScoreCard Overview</Link><span>/</span><span>ScoreCard Result Detail</span></nav>
    <button className="result-detail-back" onClick={() => navigate(backTarget.path)}><ArrowLeft size={17} />{backTarget.label}</button>

    <header className="result-scorecard-hero">
      <div><div className="result-scorecard-title-line"><h1>{scorecard.code} · {scorecard.name}</h1><span className={`report-status ${scorecard.status.toLowerCase().replace(/ /g, "-")}`}><i />{scorecard.status}</span></div><p>Final ScoreCard result and composition for the selected measurement period.</p><label><span>Result Period</span><select value={scorecard.id} onChange={event => {setParams({resultId:event.target.value});setActiveDepartment(0);}}>{periods.map(item=><option key={item.id} value={item.id}>{item.period}</option>)}</select></label></div>
    </header>

    <section className="final-score-section result-summary-grid">
      <article className="final-score-main result-composition-card">
        <header><div><h2>Final Result Composition</h2><p>Compare assigned targets with the contribution actually obtained.</p></div><div className="result-view-toggle" role="group" aria-label="Chart view"><button className={compositionView === "relative" ? "active" : ""} onClick={() => { setCompositionView("relative"); setHoveredSlice(null); setSelectedSlice(null); }}>Relative</button><button className={compositionView === "detailed" ? "active" : ""} onClick={() => { setCompositionView("detailed"); setHoveredSlice(null); setSelectedSlice(null); }}>Detailed</button></div></header>
        <div className="final-score-content">
          <div className="result-donut-column"><div className="large-score-donut result-interactive-donut" style={{ background: "transparent" }}>
            <svg viewBox="0 0 100 100" aria-label={`${compositionView} final result composition`}>{displayedSlices.map((slice) => <circle key={slice.id} cx="50" cy="50" r="41" pathLength="100" fill="none" stroke={slice.color} strokeWidth="18" strokeDasharray={`${slice.value} ${100 - slice.value}`} strokeDashoffset={-slice.offset} transform="rotate(-90 50 50)" tabIndex={0} onMouseEnter={(event) => { setHoveredSlice(slice.id); setTooltipPosition({ x: event.clientX, y: event.clientY }); }} onMouseMove={(event) => setTooltipPosition({ x: event.clientX, y: event.clientY })} onMouseLeave={() => setHoveredSlice(null)} onFocus={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setHoveredSlice(slice.id); setTooltipPosition({ x: bounds.left + bounds.width / 2, y: bounds.top }); }} onBlur={() => setHoveredSlice(null)} onClick={(event) => { setTooltipPosition({ x: event.clientX, y: event.clientY }); setSelectedSlice((current) => current === slice.id ? null : slice.id); }} />)}</svg>
            <span><strong>{percent(finalResult)}</strong><small>Final Result</small></span>{activeSlice && <div className="result-slice-tooltip" style={{ left: tooltipPosition.x + 14, top: tooltipPosition.y + 14 }}><span>{activeSlice.tooltipLabel} <b>{activeSlice.tooltipValue}</b></span><span>{activeSlice.tooltipDetail}</span></div>}
          </div><label className="result-status-field"><span>Status</span><div className={`result-final-status ${resultState.kind}`}><i>{resultState.icon}</i><strong>{resultState.label}</strong></div></label></div>
          <div className="final-composition">
            <div className="composition-numbers"><span><small>Current Period</small><strong>{period}</strong><em>Selected result period</em></span><span><small>KPI Contribution</small><strong>{percent(achievedKpi)}</strong><em>Target KPI Weight: {targetKpi}%</em></span><span><small>Linked ScoreCards Contribution</small><strong>{percent(achievedLinked)}</strong><em>Target Linked Weight: {targetLinked}%</em></span></div>
            <h3>Final Result Composition</h3>
            <div className="result-composition-track" aria-label={`KPI achieved ${achievedKpi}%, Linked ScoreCards achieved ${achievedLinked}%, Gap ${gap}%`}><i className="own" style={{ width: `${achievedKpi}%` }} /><i className="linked" style={{ width: `${achievedLinked}%` }} /><i className="gap" style={{ width: `${gap}%` }} /></div>
            {compositionView === "detailed" ? <div className="result-composition-legend scorecard-style-legend">
              <span><i className="own" /><span><b>KPI Contribution</b><small>Target KPI Weight · {targetKpi}%</small></span><strong>{percent(achievedKpi)}</strong></span>
              <span><i className="linked" /><span><b>Linked ScoreCards Contribution</b><small>Target Linked Weight · {targetLinked}%</small></span><strong>{percent(achievedLinked)}</strong></span>
              <span><i className="gap" /><span><b>Gap to 100%</b><small>Difference to maximum result</small></span><strong>{percent(gap)}</strong></span>
            </div> : <div className="result-relative-summary"><span><b>Final ScoreCard Result</b><small>Combined contribution achieved in {period}</small></span><strong>{percent(finalResult)}</strong></div>}
          </div>
        </div>
      </article>

      <aside className="result-more-details"><header><div><h2>More Details</h2><p>Calculation context for this result.</p></div></header><dl><div><dt>File Submitted</dt><dd>—</dd></div><div><dt>ScoreCard Duration</dt><dd>{scorecard.periodStart} · {scorecard.periodEnd}</dd></div><div><dt>Input Method</dt><dd>{scorecard.selectedEntryMethod ?? "—"}</dd></div><div><dt>Input Frequency</dt><dd>{scorecard.frequency}</dd></div><div><dt>KPIs Used from Pool</dt><dd>{scorecard.evaluations.length}</dd></div><div><dt>Linked ScoreCards</dt><dd>{linkedReportScorecards.length}</dd></div></dl></aside>
    </section>

    <section className="result-scope-card"><div className="result-scope-icon"><UsersRound size={22} /></div><div><small>SCOPE</small><strong>{scope.length} departments · {collaboratorCount} collaborators</strong><p>Organizational scope used to calculate the result for {period}.</p></div><button onClick={() => setScopeOpen(true)}>View ScoreCard Result</button></section>

    <section className="report-detail-table result-composition-table">
      <header><div><h2>Final ScoreCard Result Composition</h2><p>Read-only breakdown of the components included in the final result.</p></div></header>
      <div className="result-detail-tabs" role="tablist">
        <button className={tab === "full" ? "active" : ""} onClick={() => setTab("full")}><Layers3 size={18}/><span><strong>Full Composition</strong><small>KPIs and linked ScoreCards</small></span><b>{reportKpis.length + linkedReportScorecards.length}</b></button>
        <button className={tab === "kpis" ? "active" : ""} onClick={() => setTab("kpis")}><Target size={18}/><span><strong>KPIs Included</strong><small>Own performance indicators</small></span><b>{reportKpis.length}</b></button>
        <button className={tab === "linked" ? "active" : ""} onClick={() => setTab("linked")}><Link2 size={18}/><span><strong>Linked ScoreCards</strong><small>Weighted external contribution</small></span><b>{linkedReportScorecards.length}</b></button>
      </div>
      <div className="result-tab-content">
        {(tab === "full" || tab === "kpis") && <ResultKpiTable rows={reportKpis}/>}
        {(tab === "full" || tab === "linked") && <ResultLinkedTable rows={linkedReportScorecards}/>}
      </div>
    </section>

    <section className="result-more-details"><h2>Closure and Check Results</h2><p>{scorecard.justification ?? "Normal closure"}</p><p>Closed: {scorecard.closedAt ?? "—"} · Check: {scorecard.check?.id ?? "Unavailable"}</p>{scorecard.check?.issues.map((issue,index)=><p key={index}>{issue.findingCode}: {issue.message}</p>)}</section>
    <OfficialAudit events={scorecard.audit}/>
    <button className="result-detail-back result-detail-bottom-back" onClick={() => navigate(backTarget.path)}><ArrowLeft size={17} />{backTarget.label}</button>

    {scopeOpen && <div className="result-scope-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeOpen(false); }}><section className="result-scope-dialog" style={{ transform: `translate(${scopePosition.x}px, ${scopePosition.y}px)` }} role="dialog" aria-modal="true"><header className="result-scope-drag-handle" title="Drag to move" onPointerDown={startScopeDrag} onPointerMove={moveScopeDrag} onPointerUp={stopScopeDrag} onPointerCancel={stopScopeDrag}><div><span><UsersRound size={21}/></span><div><h2>Computed Scope Details</h2><p>Organizational scope used for the {period} result.</p></div></div><button onClick={() => setScopeOpen(false)} aria-label="Close"><X size={19}/></button></header><div className="result-scope-browser"><nav><small>Departments</small>{scope.map((department, index) => <button className={activeDepartment === index ? "active" : ""} onClick={() => setActiveDepartment(index)} key={department.name}><span><strong>{department.name}</strong><small>{department.collaborators.length} collaborators</small></span></button>)}</nav><section><header><strong>{scope[activeDepartment]?.name}</strong><small>{scope[activeDepartment]?.collaborators.length ?? 0} collaborators in this result</small></header><div>{scope[activeDepartment]?.collaborators.map((name) => <article key={name}><span>{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{name}</strong><small>EXA Group · Included in {period}</small></div><i><Check size={13}/></i></article>)}</div></section></div><footer><span>{collaboratorCount} collaborators in {scope.length} departments</span><button onClick={() => setScopeOpen(false)}>Done</button></footer></section></div>}
  </main>;
}

function ResultKpiTable({rows}:{rows:OfficialEvaluation[]}) {
  return <section><header><Target size={19}/><strong>KPIs Included ({rows.length})</strong></header><div className="report-table-wrap"><table><thead><tr><th>KPI Code</th><th>KPI Name / Entity</th><th>Assigned Weight</th><th>Goal</th><th>Result</th><th>Compliance %</th><th>Extra Points</th><th>Weighted Result</th><th>Goal Met</th><th>Traffic Light</th></tr></thead><tbody>{rows.map(kpi=><tr key={kpi.id}><td>{kpi.code}</td><td>{kpi.name}{kpi.entityLabel && " / " + kpi.entityLabel}</td><td>{percent(kpi.weight)}</td><td>{kpi.goal ?? "—"} {kpi.goalUnit}</td><td>{kpi.result ?? "—"} {kpi.unit}</td><td>{percent(kpi.score)}</td><td>{points(kpi.extraPoints)}</td><td>{percent(kpi.weightedContribution)}</td><td>{kpi.goalMet===null?"—":kpi.goalMet?"Yes":"No"}</td><td><OfficialTraffic value={kpi.trafficLight}/></td></tr>)}</tbody></table></div></section>;
}
function ResultLinkedTable({rows}:{rows:OfficialResult["links"]}) {
  return <section><header><Link2 size={19}/><strong>Linked ScoreCards ({rows.length})</strong></header><div className="report-table-wrap"><table><thead><tr><th>ScoreCard Code</th><th>Linked ScoreCard</th><th>Assigned Weight</th><th>Final Score</th><th>Details</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.code}</td><td>{r.name}</td><td>{percent(r.weight)}</td><td>{percent(r.score)}</td><td><Link to={resultLink(r)}>View Official Result</Link></td></tr>)}</tbody></table></div></section>;
}

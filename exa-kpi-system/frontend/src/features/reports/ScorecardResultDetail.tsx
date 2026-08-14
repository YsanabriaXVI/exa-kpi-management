import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ArrowLeft, Check, Layers3, Link2, Target, UsersRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { linkedReportScorecards, reportKpis, reportScorecards } from "./reports.data";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./reports.css";
import "./scorecard-result-detail.css";
import "./scorecard-result-detail-polish.css";

type CompositionView = "detailed" | "relative";
type ResultTab = "full" | "kpis" | "linked";

const periods = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => `${month} 2026`);
const collaboratorsByDepartment = [
  ["Carlos Gomez", "Maria Lopez", "Daniel Ruiz", "Ana Torres"],
  ["Sofia Ramirez", "Luis Mendoza", "Elena Castro"],
  ["Miguel Flores", "Paola Herrera", "Jorge Silva"],
];

export function ScorecardResultDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedCode = params.get("scorecardCode");
  const openedFrom = params.get("from");
  const [period, setPeriod] = useState("Jun 2026");
  const [compositionView, setCompositionView] = useState<CompositionView>("detailed");
  const [tab, setTab] = useState<ResultTab>("full");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(0);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [scopePosition, setScopePosition] = useState({ x: 0, y: 0 });
  const scopeDrag = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(null);
  const scorecard = reportScorecards.find((item) => item.code === selectedCode);

  const scope = useMemo(() => (scorecard?.departments ?? []).map((department, index) => ({
    name: department,
    collaborators: collaboratorsByDepartment[index % collaboratorsByDepartment.length],
  })), [scorecard]);
  const collaboratorCount = scope.reduce((total, department) => total + department.collaborators.length, 0);
  const backTarget = openedFrom === "history"
    ? { path: "/app/reports/scorecard-results-history", label: "Back to ScoreCard Results History" }
    : openedFrom === "analysis"
      ? { path: "/app/reports/analysis/scorecard-analysis", label: "Back to ScoreCard Analysis" }
      : openedFrom === "overview"
        ? { path: "/app/reports/latest-scorecard-results", label: "Back to Latest ScoreCard Results" }
        : { path: "/app/scorecards/overview", label: "Back to ScoreCard Overview" };

  if (!scorecard) return <main className="reports-page report-detail-page"><nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><span>ScoreCard Result Detail</span></nav><section className="report-detail-empty"><h1>No ScoreCard Result selected</h1><p>Open a ScoreCard from Overview to view its result.</p><button onClick={() => navigate("/app/scorecards/overview")}><ArrowLeft size={16} />Back to ScoreCard Overview</button></section></main>;

  const targetKpi = 70;
  const targetLinked = 30;
  const achievedKpi = 59.11;
  const achievedLinked = 21.16;
  const finalResult = achievedKpi + achievedLinked;
  const gap = 100 - finalResult;
  const relativeColor = finalResult >= 80 ? "#20ad63" : finalResult >= 65 ? "#e3b322" : "#d94b47";
  const resultState = finalResult >= 80 ? { kind: "good", label: "Excellent", icon: <Check size={20} strokeWidth={3}/> } : finalResult >= 65 ? { kind: "warning", label: "Warning", icon: <AlertTriangle size={20} strokeWidth={3}/> } : { kind: "danger", label: "Danger", icon: <AlertTriangle size={20} strokeWidth={3}/> };
  const slices = [
    { id: "kpi", value: achievedKpi, offset: 0, color: "#7650a0", tooltipLabel: "Own KPI Contribution:", tooltipValue: `${achievedKpi.toFixed(2)}%`, tooltipDetail: `Target KPI Weight: ${targetKpi}%` },
    { id: "linked", value: achievedLinked, offset: achievedKpi, color: "#2383b8", tooltipLabel: "Linked ScoreCards Contribution:", tooltipValue: `${achievedLinked.toFixed(2)}%`, tooltipDetail: `Target Linked Weight: ${targetLinked}%` },
    { id: "gap", value: gap, offset: finalResult, color: "#9aa6b2", tooltipLabel: "Gap to 100%:", tooltipValue: `${gap.toFixed(2)}%`, tooltipDetail: "Difference between the obtained result and 100%" },
  ];
  const relativeSlices = [
    { id: "result", value: finalResult, offset: 0, color: relativeColor, tooltipLabel: "Final ScoreCard Result:", tooltipValue: `${finalResult.toFixed(2)}%`, tooltipDetail: `Performance status: ${resultState.label}` },
    { id: "relative-gap", value: gap, offset: finalResult, color: "#9aa6b2", tooltipLabel: "Gap to 100%:", tooltipValue: `${gap.toFixed(2)}%`, tooltipDetail: "Difference between the Final ScoreCard Result and 100%" },
  ];
  const displayedSlices = compositionView === "detailed" ? slices : relativeSlices;
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
      <div><div className="result-scorecard-title-line"><h1>{scorecard.code} · {scorecard.name}</h1><span className={`report-status ${scorecard.status.toLowerCase().replace(/ /g, "-")}`}><i />{scorecard.status}</span></div><p>Final ScoreCard result and composition for the selected measurement period.</p><label><span>Result Period</span><select value={period} onChange={(event) => setPeriod(event.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    </header>

    <section className="final-score-section result-summary-grid">
      <article className="final-score-main result-composition-card">
        <header><div><h2>Final Result Composition</h2><p>Compare assigned targets with the contribution actually obtained.</p></div><div className="result-view-toggle" role="group" aria-label="Chart view"><button className={compositionView === "relative" ? "active" : ""} onClick={() => { setCompositionView("relative"); setHoveredSlice(null); setSelectedSlice(null); }}>Relative</button><button className={compositionView === "detailed" ? "active" : ""} onClick={() => { setCompositionView("detailed"); setHoveredSlice(null); setSelectedSlice(null); }}>Detailed</button></div></header>
        <div className="final-score-content">
          <div className="result-donut-column"><div className="large-score-donut result-interactive-donut" style={{ background: "transparent" }}>
            <svg viewBox="0 0 100 100" aria-label={`${compositionView} final result composition`}>{displayedSlices.map((slice) => <circle key={slice.id} cx="50" cy="50" r="41" pathLength="100" fill="none" stroke={slice.color} strokeWidth="18" strokeDasharray={`${slice.value} ${100 - slice.value}`} strokeDashoffset={-slice.offset} transform="rotate(-90 50 50)" tabIndex={0} onMouseEnter={(event) => { setHoveredSlice(slice.id); setTooltipPosition({ x: event.clientX, y: event.clientY }); }} onMouseMove={(event) => setTooltipPosition({ x: event.clientX, y: event.clientY })} onMouseLeave={() => setHoveredSlice(null)} onFocus={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setHoveredSlice(slice.id); setTooltipPosition({ x: bounds.left + bounds.width / 2, y: bounds.top }); }} onBlur={() => setHoveredSlice(null)} onClick={(event) => { setTooltipPosition({ x: event.clientX, y: event.clientY }); setSelectedSlice((current) => current === slice.id ? null : slice.id); }} />)}</svg>
            <span><strong>{finalResult.toFixed(2)}%</strong><small>Final Result</small></span>{activeSlice && <div className="result-slice-tooltip" style={{ left: tooltipPosition.x + 14, top: tooltipPosition.y + 14 }}><span>{activeSlice.tooltipLabel} <b>{activeSlice.tooltipValue}</b></span><span>{activeSlice.tooltipDetail}</span></div>}
          </div><label className="result-status-field"><span>Status</span><div className={`result-final-status ${resultState.kind}`}><i>{resultState.icon}</i><strong>{resultState.label}</strong></div></label></div>
          <div className="final-composition">
            <div className="composition-numbers"><span><small>Current Period</small><strong>{period}</strong><em>Selected result period</em></span><span><small>KPI Contribution</small><strong>{achievedKpi.toFixed(2)}%</strong><em>Target KPI Weight: {targetKpi}%</em></span><span><small>Linked ScoreCards Contribution</small><strong>{achievedLinked.toFixed(2)}%</strong><em>Target Linked Weight: {targetLinked}%</em></span></div>
            <h3>Final Result Composition</h3>
            <div className="result-composition-track" aria-label={`KPI achieved ${achievedKpi}%, Linked ScoreCards achieved ${achievedLinked}%, Gap ${gap}%`}><i className="own" style={{ width: `${achievedKpi}%` }} /><i className="linked" style={{ width: `${achievedLinked}%` }} /><i className="gap" style={{ width: `${gap}%` }} /></div>
            {compositionView === "detailed" ? <div className="result-composition-legend scorecard-style-legend">
              <span><i className="own" /><span><b>KPI Contribution</b><small>Target KPI Weight · {targetKpi}%</small></span><strong>{achievedKpi.toFixed(2)}%</strong></span>
              <span><i className="linked" /><span><b>Linked ScoreCards Contribution</b><small>Target Linked Weight · {targetLinked}%</small></span><strong>{achievedLinked.toFixed(2)}%</strong></span>
              <span><i className="gap" /><span><b>Gap to 100%</b><small>Difference to maximum result</small></span><strong>{gap.toFixed(2)}%</strong></span>
            </div> : <div className="result-relative-summary"><span><b>Final ScoreCard Result</b><small>Combined contribution achieved in {period}</small></span><strong>{finalResult.toFixed(2)}%</strong></div>}
          </div>
        </div>
      </article>

      <aside className="result-more-details"><header><div><h2>More Details</h2><p>Calculation context for this result.</p></div></header><dl><div><dt>File Submitted</dt><dd>exa_pool_ops_jun_2026.xlsx</dd></div><div><dt>ScoreCard Duration</dt><dd>Jan - Dec 2026</dd></div><div><dt>Input Method</dt><dd>Excel Template</dd></div><div><dt>Input Frequency</dt><dd>{scorecard.frequency}</dd></div><div><dt>KPIs Used from Pool</dt><dd>{scorecard.kpis} / 50</dd></div><div><dt>Linked ScoreCards</dt><dd>{linkedReportScorecards.length}</dd></div></dl></aside>
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
        {(tab === "full" || tab === "kpis") && <ResultKpiTable />}
        {(tab === "full" || tab === "linked") && <ResultLinkedTable />}
      </div>
    </section>

    <button className="result-detail-back result-detail-bottom-back" onClick={() => navigate(backTarget.path)}><ArrowLeft size={17} />{backTarget.label}</button>

    {scopeOpen && <div className="result-scope-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeOpen(false); }}><section className="result-scope-dialog" style={{ transform: `translate(${scopePosition.x}px, ${scopePosition.y}px)` }} role="dialog" aria-modal="true"><header className="result-scope-drag-handle" title="Drag to move" onPointerDown={startScopeDrag} onPointerMove={moveScopeDrag} onPointerUp={stopScopeDrag} onPointerCancel={stopScopeDrag}><div><span><UsersRound size={21}/></span><div><h2>Computed Scope Details</h2><p>Organizational scope used for the {period} result.</p></div></div><button onClick={() => setScopeOpen(false)} aria-label="Close"><X size={19}/></button></header><div className="result-scope-browser"><nav><small>Departments</small>{scope.map((department, index) => <button className={activeDepartment === index ? "active" : ""} onClick={() => setActiveDepartment(index)} key={department.name}><span><strong>{department.name}</strong><small>{department.collaborators.length} collaborators</small></span></button>)}</nav><section><header><strong>{scope[activeDepartment]?.name}</strong><small>{scope[activeDepartment]?.collaborators.length ?? 0} collaborators in this result</small></header><div>{scope[activeDepartment]?.collaborators.map((name) => <article key={name}><span>{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{name}</strong><small>EXA Group · Included in {period}</small></div><i><Check size={13}/></i></article>)}</div></section></div><footer><span>{collaboratorCount} collaborators in {scope.length} departments</span><button onClick={() => setScopeOpen(false)}>Done</button></footer></section></div>}
  </main>;
}

function ResultKpiTable() {
  type Key = "code" | "name" | "weight" | "goal" | "result" | "score" | "traffic";
  const [sort, setSort] = useState<{ key: Key; direction: SortDirection }>({ key: "code", direction: "asc" });
  const rows = useMemo(() => [...reportKpis].sort((a, b) => compareSortValues(a[sort.key], b[sort.key], sort.direction)), [sort]);
  const header = (key: Key, label: string) => <SortableTableHeader active={sort.key === key} direction={sort.direction} onSort={() => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>{label}</SortableTableHeader>;
  return <section><header><Target size={19}/><div><strong>KPIs Included</strong><small><span className="result-section-count-badge">{reportKpis.length} KPI Performance Included</span></small></div></header><div className="report-table-wrap"><table><thead><tr>{header("code", "KPI Code")}{header("name", "KPI Name")}{header("weight", "Assigned Weight")}{header("goal", "Goal")}{header("result", "Result")}{header("score", "Score")}<th>Weighted Result</th>{header("traffic", "Traffic Light")}</tr></thead><tbody>{rows.map((kpi) => <tr key={kpi.code}><td><strong>{kpi.code}</strong></td><td>{kpi.name}</td><td>{kpi.weight}%</td><td>{kpi.goal}</td><td>{kpi.result}</td><td>{Math.min(100, kpi.score)}%</td><td>{((kpi.weight * Math.min(100, kpi.score)) / 100).toFixed(2)}%</td><td><span className={`detail-traffic ${kpi.traffic.toLowerCase()}`}><i />{kpi.traffic}</span></td></tr>)}</tbody></table></div></section>;
}

function ResultLinkedTable() {
  type Key = "code" | "name" | "weight" | "score" | "weightedValue" | "status";
  const [sort, setSort] = useState<{ key: Key; direction: SortDirection }>({ key: "code", direction: "asc" });
  const rows = useMemo(() => [...linkedReportScorecards].sort((a, b) => compareSortValues(a[sort.key], b[sort.key], sort.direction)), [sort]);
  const header = (key: Key, label: string) => <SortableTableHeader active={sort.key === key} direction={sort.direction} onSort={() => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>{label}</SortableTableHeader>;
  return <section><header><Link2 size={19}/><div><strong>Linked ScoreCards</strong><small><span className="result-section-count-badge linked">{linkedReportScorecards.length} Weighted Contributions</span></small></div></header><div className="report-table-wrap"><table><thead><tr>{header("code", "ScoreCard Code")}{header("name", "Linked ScoreCard")}{header("weight", "Assigned Weight")}{header("score", "Final Score")}{header("weightedValue", "Weighted Result")}{header("status", "Result Status")}</tr></thead><tbody>{rows.map((item) => <tr key={item.code}><td><strong>{item.code}</strong></td><td>{item.name}</td><td>{item.weight}%</td><td>{item.score}%</td><td>{item.weightedValue}%</td><td><span className="report-status"><i />{item.status}</span></td></tr>)}</tbody></table></div></section>;
}

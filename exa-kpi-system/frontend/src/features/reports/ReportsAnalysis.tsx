import { ArrowRight, BarChart3, GitCompareArrows, Info, Target, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./reports.css";
import "./reports-analysis-overrides.css";

export function ReportsAnalysis() {
  const navigate = useNavigate();
  return <main className="reports-page analysis-page">
    <nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><span>Analysis</span></nav>
    <header className="reports-header"><div><span>DYNAMIC REPORTING</span><h1>Analysis</h1><p>Choose whether you want to compare consolidated ScoreCard performance or investigate a specific KPI across periods and assignments.</p></div></header>
    <section className="analysis-selector"><header><span><BarChart3 size={22} /></span><div><h2>What would you like to analyze?</h2><p>Each analysis type applies its own filters, summaries, tables and comparisons.</p></div></header><div className="analysis-options">
      <article className="scorecard-option"><div className="analysis-option-icon"><GitCompareArrows size={30} /></div><span>GLOBAL PERFORMANCE</span><h2>ScoreCard Analysis</h2><p>Compare final results, historical composition and linked ScoreCard impact between multiple ScoreCards and equivalent periods.</p><div className="analysis-best"><strong>Best for</strong><span>Period comparison</span><span>Benchmarking</span><span>Final score</span><span>Composition</span></div><ul><li><TrendingUp size={15} />Current versus previous periods</li><li><BarChart3 size={15} />Own KPIs and linked contribution</li></ul><button onClick={() => navigate("/app/reports/analysis/scorecard-analysis")}>Analyze ScoreCards <ArrowRight size={16} /></button></article>
      <article className="kpi-option"><div className="analysis-option-icon"><Target size={30} /></div><span>SPECIFIC PERFORMANCE</span><h2>KPI Analysis</h2><p>Analyze one KPI over time or benchmark the same KPI across several ScoreCards using goals, scores and compliance rates.</p><div className="analysis-best"><strong>Best for</strong><span>KPI trend</span><span>Goal gap</span><span>Score ranking</span><span>Benchmark</span></div><ul><li><TrendingUp size={15} />Goal versus result and score trend</li><li><BarChart3 size={15} />Ranking across ScoreCards</li></ul><button onClick={() => navigate("/app/reports/analysis/kpi-analysis")}>Analyze KPIs <ArrowRight size={16} /></button></article>
    </div></section>
    <aside className="analysis-tip"><Info size={18} /><div><strong>Which one should I use?</strong><p>Use ScoreCard Analysis for consolidated performance and composition. Use KPI Analysis when the question is about a goal, trend or comparison for one KPI.</p></div></aside>
  </main>;
}

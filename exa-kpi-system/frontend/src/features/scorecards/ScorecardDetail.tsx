import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  Database,
  Eye,
  Gauge,
  Layers3,
  Link2,
  LoaderCircle,
  Search,
  Settings2,
  Target,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { scorecardService } from "./scorecard.service";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./scorecards.css";

type DetailTab = "overview" | "kpis" | "linked";
type CompositionView = "relative" | "detailed";
type KpiSortKey = "configCode" | "name" | "weight" | "goal" | "unit" | "source" | "state";
type LinkedSortKey = "code" | "name" | "company" | "departments" | "frequency" | "weight" | "status";

const kpiComposition = [
  { configCode: "KPC-049-01", code: "KPI-049", name: "Reducir costos operativos", category: "Financial", weight: 10, goal: "Reduce 20%", unit: "%", source: "Integration EMS - SAP", traffic: "100–80 · 79–65 · 64–0", state: "ACTIVE" },
  { configCode: "KPC-050-01", code: "KPI-050", name: "Productividad kms/cabezal", category: "Operations", weight: 10, goal: "3,700 kms", unit: "km", source: "Integration EMS - SAP", traffic: "100–80 · 79–65 · 64–0", state: "ACTIVE" },
  { configCode: "KPC-051-01", code: "KPI-051", name: "Aumentar ventas de contenedores", category: "Commercial", weight: 10, goal: "+100", unit: "Quantity", source: "Integration EMS - SAP", traffic: "100–80 · 79–65 · 64–0", state: "ACTIVE" },
  { configCode: "KPC-052-01", code: "KPI-052", name: "Daños en transporte", category: "Operations", weight: 10, goal: "0 daños", unit: "Quantity", source: "EMS", traffic: "100–80 · 79–65 · 64–0", state: "ACTIVE" },
  { configCode: "KPC-053-01", code: "KPI-053", name: "Aumentar venta de Gensets", category: "Commercial", weight: 10, goal: "+5%", unit: "%", source: "Depot - EMS", traffic: "100–80 · 79–65 · 64–0", state: "ACTIVE" },
  { configCode: "KPC-054-01", code: "KPI-054", name: "Disponibilidad de flota", category: "Operations", weight: 8, goal: "95%", unit: "%", source: "TMS", traffic: "100–90 · 89–75 · 74–0", state: "ACTIVE" },
  { configCode: "KPC-055-01", code: "KPI-055", name: "Tiempo promedio de respuesta", category: "Service", weight: 7, goal: "≤ 24 h", unit: "Hours", source: "CRM", traffic: "100–85 · 84–70 · 69–0", state: "ACTIVE" },
  { configCode: "KPC-056-01", code: "KPI-056", name: "Cumplimiento de mantenimiento", category: "Safety", weight: 5, goal: "98%", unit: "%", source: "Maintenance Hub", traffic: "100–90 · 89–80 · 79–0", state: "ACTIVE" },
];

const linkedComposition = [
  { code: "SCD-0104", name: "Facturación Mensual", company: "EXA", departments: "Finance", frequency: "Monthly", weight: 12, status: "ACTIVE" },
  { code: "SCD-0107", name: "MRM Mensual", company: "CONMOXA", departments: "Operations", frequency: "Monthly", weight: 10, status: "ACTIVE" },
  { code: "SCD-0109", name: "Servicio al Cliente Mensual", company: "Grupo EXA", departments: "Service", frequency: "Monthly", weight: 8, status: "ACTIVE" },
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ScorecardDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scorecardId = Number(searchParams.get("scorecardId") ?? 0);
  const scorecardCode = searchParams.get("scorecardCode");
  const sourcePoolId = Number(searchParams.get("poolId")) || 1;
  const openedFromPool = Boolean(scorecardCode) && searchParams.get("from") === "pool-detail";
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [compositionView, setCompositionView] = useState<CompositionView>("relative");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [kpiSort, setKpiSort] = useState<{ key: KpiSortKey; direction: SortDirection }>({ key: "configCode", direction: "asc" });
  const [linkedSort, setLinkedSort] = useState<{ key: LinkedSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const query = useQuery({
    queryKey: ["scorecard", scorecardCode ?? scorecardId],
    queryFn: () => scorecardCode
      ? kpiPoolService.getScorecardDetailByCode(scorecardCode)
      : scorecardService.getById(scorecardId),
    enabled: Boolean(scorecardCode) || scorecardId > 0,
  });
  const item = query.data;
  const filteredKpis = useMemo(() => kpiComposition.filter((kpi) => {
    const term = search.toLowerCase();
    return (!term || `${kpi.configCode} ${kpi.code} ${kpi.name} ${kpi.source}`.toLowerCase().includes(term))
      && (!category || kpi.category === category);
  }).sort((a, b) => compareSortValues(a[kpiSort.key], b[kpiSort.key], kpiSort.direction)), [category, kpiSort, search]);
  const filteredLinked = useMemo(() => linkedComposition.filter((scorecard) => {
    const term = search.toLowerCase();
    return !term || `${scorecard.code} ${scorecard.name} ${scorecard.company} ${scorecard.departments}`.toLowerCase().includes(term);
  }).sort((a, b) => compareSortValues(a[linkedSort.key], b[linkedSort.key], linkedSort.direction)), [linkedSort, search]);

  if (!scorecardId && !scorecardCode) return <main className="scorecard-page"><div className="scorecard-detail-error"><h1>No ScoreCard selected</h1><p>Open a ScoreCard from the Overview to view its details.</p><button className="button primary" onClick={() => navigate("/app/scorecards/overview")}>Back to Overview</button></div></main>;
  if (query.isLoading) return <main className="scorecard-page"><div className="scorecard-detail-loading" role="status" aria-live="polite"><LoaderCircle size={22} /><span>Cargando información…</span></div></main>;
  if (query.isError || !item) return <main className="scorecard-page"><div className="scorecard-detail-error"><h1>ScoreCard not found</h1><p>The requested record is no longer available in the Overview.</p><button className="button primary" onClick={() => navigate("/app/scorecards/overview")}>Back to Overview</button></div></main>;

  const duration = item.durationMonths.length
    ? `${monthNames[item.durationMonths[0]]} – ${monthNames[item.durationMonths[item.durationMonths.length - 1]]} ${item.year}`
    : `No period · ${item.year}`;
  const statusLabel = item.status.charAt(0) + item.status.slice(1).toLowerCase();
  const ownKpiWeight = kpiComposition.reduce((total, kpi) => total + kpi.weight, 0);
  const linkedWeight = linkedComposition.reduce((total, linked) => total + linked.weight, 0);
  const compositionTotal = ownKpiWeight + linkedWeight;
  const linkedColors = ["#13ae78", "#7650a0", "#e69a2d", "#d94f70", "#168bb4"];
  const compositionSegments = compositionView === "relative"
    ? [
      { label: "KPI Performance", value: ownKpiWeight, color: "#2f68df" },
      { label: "Linked ScoreCards Total", value: linkedWeight, color: "#13ae78" },
    ]
    : [
      { label: "KPI Performance", value: ownKpiWeight, color: "#2f68df" },
      ...linkedComposition.map((linked, index) => ({ label: `${linked.code} · ${linked.name}`, value: linked.weight, color: linkedColors[index % linkedColors.length] })),
    ];
  let compositionCursor = 0;
  const compositionGradient = `conic-gradient(${compositionSegments.map((segment) => {
    const start = compositionCursor;
    compositionCursor += compositionTotal ? (segment.value / compositionTotal) * 100 : 0;
    return `${segment.color} ${start}% ${compositionCursor}%`;
  }).join(",")})`;
  const kpiHeader = (key: KpiSortKey, label: string) => <SortableTableHeader active={kpiSort.key === key} direction={kpiSort.direction} onSort={() => setKpiSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>{label}</SortableTableHeader>;
  const linkedHeader = (key: LinkedSortKey, label: string) => <SortableTableHeader active={linkedSort.key === key} direction={linkedSort.direction} onSort={() => setLinkedSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>{label}</SortableTableHeader>;

  return <main className="scorecard-page scorecard-detail-page">
    <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
      <Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><span aria-current="page">ScoreCard Detail</span>
    </nav>

    <header className="scorecard-detail-hero">
      <div>
        <div className="scorecard-detail-title-line"><h1>{item.code} · {item.name}</h1><span className={`scorecard-status ${item.status.toLowerCase()}`}><i />{statusLabel}</span></div>
        <p>Read-only view of the ScoreCard scope and saved composition.</p>
      </div>
      <button className="button scorecard-edit-assignment" onClick={() => navigate(`/app/scorecards/assignment?scorecardId=${item.id}`)}><Settings2 size={16} /> Edit Assignment</button>
    </header>

    <section className="scorecard-detail-info">
      <header><div><Layers3 size={18} /><span><strong>ScoreCard Information</strong><small>General definition and evaluation scope</small></span></div><span className="read-only-badge">Read only</span></header>
      <div className="scorecard-detail-info-grid">
        <DetailFact icon={<Building2 size={16} />} label="Companies" value={item.company} />
        <DetailFact icon={<Database size={16} />} label="KPI Pool Source" value={item.poolSource} />
        <DetailFact icon={<CalendarDays size={16} />} label="Period" value={duration} />
        <DetailFact icon={<Gauge size={16} />} label="Input Frequency" value={item.inputFrequency} />
        <DetailFact icon={<UsersRound size={16} />} label="Departments" value={item.departments.join(", ")} hint={`${item.collaborators} collaborators`} />
        <DetailFact icon={<Target size={16} />} label="Expected Inputs" value={String(Math.max(1, Math.floor(item.durationMonths.length / frequencySize(item.inputFrequency))))} />
      </div>
    </section>

    <section className="scorecard-composition-overview">
      <article className="scorecard-composition-card">
        <header><div><h2>Composition Summary</h2><p>{compositionView === "relative" ? "Own KPIs compared with all linked ScoreCards" : "Own KPIs and each linked ScoreCard contribution"}</p></div><div className="composition-view-controls"><select value={compositionView} onChange={(event) => setCompositionView(event.target.value as CompositionView)} aria-label="Composition chart view"><option value="relative">Relative composition</option><option value="detailed">Detailed composition</option></select><strong>{compositionTotal}%</strong></div></header>
        <div className="scorecard-composition-chart">
          <div className="scorecard-donut" style={{ background: compositionGradient }} aria-label={compositionSegments.map((segment) => `${segment.label} ${segment.value}%`).join(", ")}><span><strong>{compositionTotal}%</strong><small>Total weight</small></span></div>
          <div className="scorecard-composition-totals">
            {compositionSegments.map((segment) => <div key={segment.label}><span className="composition-dot" style={{ background: segment.color }} /><span><small>{segment.label}</small><strong>{segment.value}%</strong></span></div>)}
          </div>
        </div>
      </article>
      <article className="scorecard-breakdown-card">
        <header><div><h2>Composition Breakdown</h2><p>Contribution saved in the assignment</p></div></header>
        <div className="scorecard-breakdown-list">
          <div className="primary"><span aria-hidden="true" /><div><strong>KPI Performance</strong><small>{kpiComposition.length} KPI configurations from {item.poolSource}</small></div><b>70%</b></div>
          {linkedComposition.map((linked, index) => <div key={linked.code}><span aria-hidden="true" style={{ background: linkedColors[index % linkedColors.length] }} /><div><strong>{linked.name}</strong><small>{linked.code} · {linked.company}</small></div><b>{linked.weight}%</b></div>)}
        </div>
      </article>
    </section>

    <section className="scorecard-detail-data">
      <header className="scorecard-detail-tabs-header">
        <div className="scorecard-detail-tabs" role="tablist" aria-label="ScoreCard composition">
          <button type="button" role="tab" aria-selected={activeTab === "overview"} className={activeTab === "overview" ? "active" : ""} onClick={() => { setActiveTab("overview"); setSearch(""); setCategory(""); }}>
            <Layers3 size={16} /><span><strong>Full Composition</strong><small>KPIs and linked ScoreCards</small></span><b>{kpiComposition.length + linkedComposition.length}</b>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "kpis"} className={activeTab === "kpis" ? "active" : ""} onClick={() => { setActiveTab("kpis"); setSearch(""); }}>
            <Target size={16} /><span><strong>KPIs Included</strong><small>Own performance indicators</small></span><b>{kpiComposition.length}</b>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "linked"} className={activeTab === "linked" ? "active" : ""} onClick={() => { setActiveTab("linked"); setSearch(""); setCategory(""); }}>
            <Link2 size={16} /><span><strong>Linked ScoreCards</strong><small>Weighted external contribution</small></span><b>{linkedComposition.length}</b>
          </button>
        </div>
        <div className="scorecard-detail-table-tools">
          <label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={activeTab === "overview" ? "Search the full composition..." : activeTab === "kpis" ? "Search KPI code, name or source..." : "Search linked ScoreCard..."} /></label>
          {activeTab === "kpis" && <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(kpiComposition.map((kpi) => kpi.category))].map((item) => <option key={item}>{item}</option>)}</select>}
        </div>
      </header>

      <div className="scorecard-detail-table-wrap">
        {activeTab === "overview" ? <div className="scorecard-full-composition">
          <section><header><div><Target size={18} /><span><strong>KPIs Included</strong><small>{filteredKpis.length} KPI configurations</small></span></div></header><table className="kpi-table scorecard-detail-table"><thead><tr>{kpiHeader("configCode", "Config Code")}{kpiHeader("name", "KPI")}{kpiHeader("weight", "Weight")}{kpiHeader("goal", "Goal")}{kpiHeader("unit", "Unit")}{kpiHeader("source", "Data Source")}<th>Traffic Light</th>{kpiHeader("state", "State")}<th>Actions</th></tr></thead><tbody>
            {filteredKpis.length ? filteredKpis.map((kpi) => <tr key={kpi.configCode}><td><span className="code-pill">{kpi.configCode}</span></td><td><strong className="scorecard-detail-kpi-name">{kpi.name}</strong><small className="scorecard-detail-kpi-code">{kpi.code} · {kpi.category}</small></td><td><span className="weight-pill">{kpi.weight}%</span></td><td>{kpi.goal}</td><td>{kpi.unit}</td><td>{kpi.source}</td><td><TrafficDots /></td><td><span className="scorecard-status active"><i />Active</span></td><td><button className="icon-button view" title="View KPI Configuration Detail" onClick={() => navigate(`/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(kpi.configCode)}&from=scorecard-detail&scorecardId=${item.id}`)}><Eye size={14} /></button></td></tr>) : <tr><td colSpan={9} className="table-message">No KPIs match the current filters.</td></tr>}
          </tbody></table></section>
          <section><header><div><Link2 size={18} /><span><strong>Linked ScoreCards</strong><small>{filteredLinked.length} linked contributions</small></span></div></header><table className="kpi-table scorecard-detail-table linked-scorecard-table"><thead><tr>{linkedHeader("code", "ScoreCard Code")}{linkedHeader("name", "Linked ScoreCard")}{linkedHeader("company", "Company")}{linkedHeader("departments", "Department")}{linkedHeader("frequency", "Frequency")}{linkedHeader("weight", "Weight")}{linkedHeader("status", "Status")}<th>Actions</th></tr></thead><tbody>
            {filteredLinked.length ? filteredLinked.map((linked) => <tr key={linked.code}><td><span className="code-pill">{linked.code}</span></td><td><strong className="scorecard-detail-kpi-name">{linked.name}</strong><small className="scorecard-detail-kpi-code">Linked contribution</small></td><td>{linked.company}</td><td>{linked.departments}</td><td>{linked.frequency}</td><td><span className="weight-pill linked">{linked.weight}%</span></td><td><span className="scorecard-status active"><i />Active</span></td><td><button className="icon-button view" title="View linked ScoreCard Detail" onClick={() => navigate(`/app/scorecards/detail?scorecardCode=${encodeURIComponent(linked.code)}&from=scorecard-detail&parentScorecardId=${item.id}`)}><Eye size={14} /></button></td></tr>) : <tr><td colSpan={8} className="table-message">No linked ScoreCards match the search.</td></tr>}
          </tbody></table></section>
        </div> : activeTab === "kpis" ? <table className="kpi-table scorecard-detail-table"><thead><tr>{kpiHeader("configCode", "Config Code")}{kpiHeader("name", "KPI")}{kpiHeader("weight", "Weight")}{kpiHeader("goal", "Goal")}{kpiHeader("unit", "Unit")}{kpiHeader("source", "Data Source")}<th>Traffic Light</th>{kpiHeader("state", "State")}<th>Actions</th></tr></thead><tbody>
          {filteredKpis.length ? filteredKpis.map((kpi) => <tr key={kpi.configCode}><td><span className="code-pill">{kpi.configCode}</span></td><td><strong className="scorecard-detail-kpi-name">{kpi.name}</strong><small className="scorecard-detail-kpi-code">{kpi.code} · {kpi.category}</small></td><td><span className="weight-pill">{kpi.weight}%</span></td><td>{kpi.goal}</td><td>{kpi.unit}</td><td>{kpi.source}</td><td><TrafficDots /></td><td><span className="scorecard-status active"><i />Active</span></td><td><button className="icon-button view" title="View KPI Configuration Detail" onClick={() => navigate(`/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(kpi.configCode)}&from=scorecard-detail&scorecardId=${item.id}`)}><Eye size={14} /></button></td></tr>) : <tr><td colSpan={9} className="table-message">No KPIs match the current filters.</td></tr>}
        </tbody></table> : <table className="kpi-table scorecard-detail-table linked-scorecard-table"><thead><tr>{linkedHeader("code", "ScoreCard Code")}{linkedHeader("name", "Linked ScoreCard")}{linkedHeader("company", "Company")}{linkedHeader("departments", "Department")}{linkedHeader("frequency", "Frequency")}{linkedHeader("weight", "Weight")}{linkedHeader("status", "Status")}<th>Actions</th></tr></thead><tbody>
          {filteredLinked.length ? filteredLinked.map((linked) => <tr key={linked.code}><td><span className="code-pill">{linked.code}</span></td><td><strong className="scorecard-detail-kpi-name">{linked.name}</strong><small className="scorecard-detail-kpi-code">Linked contribution</small></td><td>{linked.company}</td><td>{linked.departments}</td><td>{linked.frequency}</td><td><span className="weight-pill linked">{linked.weight}%</span></td><td><span className="scorecard-status active"><i />Active</span></td><td><button className="icon-button view" title="View linked ScoreCard Detail" onClick={() => navigate(`/app/scorecards/detail?scorecardCode=${encodeURIComponent(linked.code)}&from=scorecard-detail&parentScorecardId=${item.id}`)}><Eye size={14} /></button></td></tr>) : <tr><td colSpan={8} className="table-message">No linked ScoreCards match the search.</td></tr>}
        </tbody></table>}
      </div>
      <footer className="scorecard-detail-table-footer"><span>Showing <strong>{activeTab === "overview" ? filteredKpis.length + filteredLinked.length : activeTab === "kpis" ? filteredKpis.length : filteredLinked.length}</strong> of <strong>{activeTab === "overview" ? kpiComposition.length + linkedComposition.length : activeTab === "kpis" ? kpiComposition.length : linkedComposition.length}</strong> records</span><span>Composition is read only · Edit it from Assignment</span></footer>
    </section>

    <button type="button" className="scorecard-detail-back" onClick={() => navigate(openedFromPool ? `/app/pool-kpis/detail/${sourcePoolId}` : "/app/scorecards/overview")}><ChevronLeft size={15} /> {openedFromPool ? "Back to KPI Pool Detail" : "Back to Overview"}</button>
  </main>;
}

function DetailFact({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return <article className="scorecard-detail-fact"><span>{icon}</span><div><small>{label}</small><strong>{value || "Not available"}</strong>{hint && <em>{hint}</em>}</div></article>;
}

function TrafficDots() {
  return <span className="scorecard-traffic-dots" title="Red 0–65 · Yellow 66–79 · Green 80–100">
    <span className="red"><i /><small>0–65</small></span>
    <span className="yellow"><i /><small>66–79</small></span>
    <span className="green"><i /><small>80–100</small></span>
  </span>;
}

function frequencySize(frequency: string) {
  return ({ Monthly: 1, Quarterly: 3, "Four-monthly": 4, Semiannual: 6, Annual: 12 } as Record<string, number>)[frequency] ?? 1;
}

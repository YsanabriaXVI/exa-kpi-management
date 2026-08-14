import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, Eye, Link2, Minus, Plus, Search, Target, Trash2, Unlink, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { assignmentKpiCatalog, assignmentLinkedCatalog, getAssignment, saveAssignmentSelection } from "./scorecard-assignment.data";
import { scorecardService } from "./scorecard.service";
import "./scorecard-assignment.css";
import "./scorecard-search-overrides.css";

export function SelectAssignmentItems({ type }: { type: "kpis" | "linked" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scorecardId = Number(searchParams.get("scorecardId") ?? 0);
  const assignment = useMemo(() => getAssignment(scorecardId), [scorecardId]);
  const scorecardQuery = useQuery({ queryKey: ["scorecard", scorecardId], queryFn: () => scorecardService.getById(scorecardId), enabled: scorecardId > 0 });
  const initialIds = type === "kpis" ? assignment.kpis.map((item) => item.id) : assignment.linked.map((item) => item.id);
  const [selected, setSelected] = useState(initialIds);
  const [rowSelection, setRowSelection] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [activeAvailability, setActiveAvailability] = useState<"ALL" | "AVAILABLE" | "SELECTED" | "UNAVAILABLE">("ALL");
  const [detailId, setDetailId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [dataSource, setDataSource] = useState("ALL");
  const catalog = type === "kpis" ? assignmentKpiCatalog : assignmentLinkedCatalog;
  const filtered = catalog.filter((item) =>
    Object.values(item).join(" ").toLowerCase().includes(search.toLowerCase()) &&
    (!("category" in item) || category === "ALL" || item.category === category) &&
    (!("source" in item) || dataSource === "ALL" || item.source === dataSource) &&
    (activeAvailability === "ALL"
      || (activeAvailability === "SELECTED" && selected.includes(item.id))
      || (activeAvailability === "AVAILABLE" && !selected.includes(item.id) && !hidden.includes(item.id))
      || (activeAvailability === "UNAVAILABLE" && hidden.includes(item.id)))
  );
  const categories = [...new Set(assignmentKpiCatalog.map((item) => item.category))].sort();
  const dataSources = [...new Set(assignmentKpiCatalog.map((item) => item.source))].sort();
  const toggleRow = (id: string) => setRowSelection((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const persistSelection = (ids: string[]) => {
    setSelected(ids);
    saveAssignmentSelection(scorecardId, type, ids);
  };
  const linkSelectedRows = () => {
    persistSelection([...new Set([...selected, ...rowSelection.filter((id) => !hidden.includes(id))])]);
    setRowSelection([]);
  };
  const unlinkSelectedRows = () => {
    persistSelection(selected.filter((id) => !rowSelection.includes(id)));
    setRowSelection([]);
  };
  const hideSelectedRows = () => {
    setHidden((items) => [...new Set([...items, ...rowSelection])]);
    persistSelection(selected.filter((id) => !rowSelection.includes(id)));
    setRowSelection([]);
  };
  const softDelete = (id: string, label: string) => {
    if (!window.confirm(`Soft delete ${label}? It will be removed from this selection view while preserving historical information.`)) return;
    setHidden((items) => [...new Set([...items, id])]);
    setSelected((items) => items.filter((item) => item !== id));
    setRowSelection((items) => items.filter((item) => item !== id));
  };
  const backToAssignment = () => navigate(`/app/scorecards/assignment?scorecardId=${scorecardId}`);
  const detailItem = catalog.find((item) => item.id === detailId);
  const detailsModal = detailItem && <div className="selection-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailId(""); }}>
    <section className="selection-detail-modal" role="dialog" aria-modal="true" aria-labelledby="selection-detail-title">
      <header><div><span><Eye size={20} /></span><div><h2 id="selection-detail-title">{"configCode" in detailItem ? "KPI Configuration Details" : "Linked ScoreCard Details"}</h2><p>Review the selected catalog record.</p></div></div><button type="button" onClick={() => setDetailId("")} aria-label="Close details"><X size={18} /></button></header>
      <div className="selection-detail-grid">
        {"configCode" in detailItem ? <>
          <div><small>Config Code</small><strong>{detailItem.configCode}</strong></div><div><small>KPI Code</small><strong>{detailItem.code}</strong></div>
          <div className="wide"><small>KPI Name</small><strong>{detailItem.name}</strong></div><div><small>Category</small><strong>{detailItem.category}</strong></div>
          <div><small>Goal</small><strong>{detailItem.goal}</strong></div><div className="wide"><small>Data Source</small><strong>{detailItem.source}</strong></div>
        </> : <>
          <div><small>ScoreCard Code</small><strong>{detailItem.code}</strong></div><div><small>Frequency</small><strong>{detailItem.frequency}</strong></div>
          <div className="wide"><small>ScoreCard Name</small><strong>{detailItem.name}</strong></div><div><small>Company</small><strong>{detailItem.company}</strong></div>
          <div><small>Department</small><strong>{detailItem.department}</strong></div>
        </>}
      </div>
      <footer><button type="button" onClick={() => setDetailId("")}>Close</button></footer>
    </section>
  </div>;

  if (!scorecardId) {
    const pageName = type === "kpis" ? "Select KPIs from Pool" : "Select Linked ScoreCards";
    return <main className="scorecard-page assignment-page assignment-selection-page">
      <nav className="kpi-breadcrumb"><Link to="/app/scorecards/assignment">ScoreCard Assignment</Link><span>/</span><span>{pageName}</span></nav>
      <section className="assignment-subpage-empty">
        <h1>No data found</h1>
        <p>Selecciona primero un ScoreCard desde ScoreCard Overview o desde ScoreCard Assignment.</p>
        <div>
          <button type="button" className="button secondary" onClick={() => navigate("/app/scorecards/overview")}>Go to ScoreCard Overview</button>
          <button type="button" className="button primary" onClick={() => navigate("/app/scorecards/assignment")}>Go to ScoreCard Assignment</button>
        </div>
      </section>
    </main>;
  }

  if (type === "kpis") {
    const scorecard = scorecardQuery.data;
    const availableCount = assignmentKpiCatalog.filter((item) => !hidden.includes(item.id) && !selected.includes(item.id)).length;
    const durationMonths = scorecard?.durationMonths ?? [];
    const monthName = (month: number) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(scorecard?.year ?? 2026, month, 1));
    const duration = durationMonths.length ? `${monthName(durationMonths[0])} ${scorecard?.year} – ${monthName(durationMonths[durationMonths.length - 1])} ${scorecard?.year}` : "No duration";
    return <main className="scorecard-page assignment-page assignment-selection-page kpi-assignment-selection">
      <nav className="kpi-breadcrumb"><Link to={`/app/scorecards/assignment?scorecardId=${scorecardId}`}>ScoreCard Assignment</Link><span>/</span><span>Select KPIs from Pool</span></nav>
      <header className="assignment-hero"><div><Target size={23} /><h1>Select KPIs from Pool</h1><p>Choose the KPI configurations that belong to this ScoreCard.</p></div></header>

      <section className="kpi-selection-context">
        <header><h2>ScoreCard Context</h2><span>Computed information</span></header>
        <div>
          <article><small>ScoreCard</small><strong>{scorecard?.name ?? "Loading..."}</strong></article>
          <article><small>Pool Source</small><strong>{scorecard?.poolSource ?? "Loading..."}</strong></article>
          <article><small>ScoreCard Duration</small><strong>{duration}</strong></article>
          <article><small>Input Frequency</small><strong>{scorecard?.inputFrequency ?? "Loading..."}</strong></article>
        </div>
      </section>

      <section className="kpi-selection-summary">
        <header><h2>Selection Summary</h2></header>
        <div>
          <button type="button" className={`available ${activeAvailability === "AVAILABLE" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "AVAILABLE" ? "ALL" : "AVAILABLE")}><span><Plus size={16} /></span><div><small>Available to Select</small><strong>{availableCount}</strong></div></button>
          <button type="button" className={`selected ${activeAvailability === "SELECTED" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "SELECTED" ? "ALL" : "SELECTED")}><span><Check size={16} /></span><div><small>Selected in ScoreCard</small><strong>{selected.length}</strong></div></button>
          <button type="button" className={`unavailable ${activeAvailability === "UNAVAILABLE" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "UNAVAILABLE" ? "ALL" : "UNAVAILABLE")}><span><Minus size={16} /></span><div><small>Not Available</small><strong>{hidden.length}</strong></div></button>
        </div>
      </section>

      <section className="kpi-selection-table-card">
        <header><div><h2>Select KPIs for this ScoreCard</h2><p>Search, filter and manage the KPI configurations included in the assignment.</p></div></header>
        <div className="kpi-selection-toolbar">
          <label className="kpi-selection-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search KPI name, code or category..." /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select>
          <select value={dataSource} onChange={(event) => setDataSource(event.target.value)}><option value="ALL">All data sources</option>{dataSources.map((item) => <option value={item} key={item}>{item}</option>)}</select>
        </div>
        <div className="kpi-selection-table-wrap"><table className="kpi-selection-table"><thead><tr><th>Select</th><th>Availability</th><th>Config Code</th><th>KPI</th><th>Category</th><th>Goal</th><th>Data Source</th><th>State</th><th>Actions</th></tr></thead><tbody>
          {filtered.map((item) => {
            if (!("configCode" in item)) return null;
            const assigned = selected.includes(item.id);
            const unavailable = hidden.includes(item.id);
            const rowChecked = rowSelection.includes(item.id);
            return <tr className={rowChecked ? "selected" : ""} key={item.id} onClick={() => toggleRow(item.id)}>
              <td><input type="checkbox" checked={rowChecked} onClick={(event) => event.stopPropagation()} onChange={() => toggleRow(item.id)} aria-label={`${rowChecked ? "Unselect" : "Select"} ${item.name}`} /></td>
              <td><span className={`kpi-availability ${unavailable ? "unavailable" : assigned ? "selected" : "available"}`}>{unavailable ? "Not Available" : assigned ? "Selected in ScoreCard" : "Available to Select"}</span></td>
              <td><span className="code-pill">{item.configCode}</span></td>
              <td><strong>{item.name}</strong><small>{item.code}</small></td>
              <td>{item.category}</td><td>{item.goal}</td><td>{item.source}</td>
              <td><span className="kpi-active-state"><i />Active</span></td>
              <td><div className="kpi-selection-actions"><button type="button" className="view" title="View KPI details" onClick={(event) => { event.stopPropagation(); setDetailId(item.id); }}><Eye size={15} /></button><button type="button" className="soft-delete" title="Soft delete KPI Configuration" onClick={(event) => { event.stopPropagation(); softDelete(item.id, item.configCode); }}><Trash2 size={15} /></button></div></td>
            </tr>;
          })}
        </tbody></table></div>
        <footer className="selection-workflow-actions"><span><strong>{rowSelection.length}</strong> rows selected</span><button type="button" className="button secondary assignment-selection-back" onClick={backToAssignment}><ChevronLeft size={16} />Back to ScoreCard Assignment</button><div><button type="button" className="button clear-view" disabled={!rowSelection.some((id) => !hidden.includes(id))} onClick={hideSelectedRows}><Trash2 size={16} />Remove Selected</button><button type="button" className="button add-selected" disabled={!rowSelection.some((id) => !selected.includes(id) && !hidden.includes(id))} onClick={linkSelectedRows}><Link2 size={16} />Link Selected</button><button type="button" className="button unlink-selected" disabled={!rowSelection.some((id) => selected.includes(id))} onClick={unlinkSelectedRows}><Unlink size={16} />Unlink Selected</button></div></footer>
      </section>
      {detailsModal}
    </main>;
  }

  const linkedScorecard = scorecardQuery.data;
  const linkedAvailableCount = assignmentLinkedCatalog.filter((item) => !hidden.includes(item.id) && !selected.includes(item.id)).length;
  const linkedDurationMonths = linkedScorecard?.durationMonths ?? [];
  const linkedMonthName = (month: number) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(linkedScorecard?.year ?? 2026, month, 1));
  const linkedDuration = linkedDurationMonths.length ? `${linkedMonthName(linkedDurationMonths[0])} ${linkedScorecard?.year} – ${linkedMonthName(linkedDurationMonths[linkedDurationMonths.length - 1])} ${linkedScorecard?.year}` : "No duration";

  return <main className="scorecard-page assignment-page assignment-selection-page kpi-assignment-selection linked-assignment-selection">
    <nav className="kpi-breadcrumb"><Link to={`/app/scorecards/assignment?scorecardId=${scorecardId}`}>ScoreCard Assignment</Link><span>/</span><span>Select Linked ScoreCards</span></nav>
    <header className="assignment-hero"><div><Link2 size={23} /><h1>Select Linked ScoreCards</h1><p>Choose other ScoreCards that contribute to this composition.</p></div></header>
    <section className="kpi-selection-context">
      <header><h2>ScoreCard Context</h2><span>Computed information</span></header>
      <div>
        <article><small>ScoreCard</small><strong>{linkedScorecard?.name ?? "Loading..."}</strong></article>
        <article><small>Pool Source</small><strong>{linkedScorecard?.poolSource ?? "Loading..."}</strong></article>
        <article><small>ScoreCard Duration</small><strong>{linkedDuration}</strong></article>
        <article><small>Input Frequency</small><strong>{linkedScorecard?.inputFrequency ?? "Loading..."}</strong></article>
      </div>
    </section>
    <section className="kpi-selection-summary">
      <header><h2>Selection Summary</h2></header>
      <div>
        <button type="button" className={`available ${activeAvailability === "AVAILABLE" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "AVAILABLE" ? "ALL" : "AVAILABLE")}><span><Plus size={16} /></span><div><small>Available to Link</small><strong>{linkedAvailableCount}</strong></div></button>
        <button type="button" className={`selected ${activeAvailability === "SELECTED" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "SELECTED" ? "ALL" : "SELECTED")}><span><Check size={16} /></span><div><small>Linked to ScoreCard</small><strong>{selected.length}</strong></div></button>
        <button type="button" className={`unavailable ${activeAvailability === "UNAVAILABLE" ? "active" : ""}`} onClick={() => setActiveAvailability(activeAvailability === "UNAVAILABLE" ? "ALL" : "UNAVAILABLE")}><span><Minus size={16} /></span><div><small>Not Available</small><strong>{hidden.length}</strong></div></button>
      </div>
    </section>
    <section className="kpi-selection-table-card">
      <header><div><h2>Select ScoreCards to Link</h2><p>Search and manage ScoreCards that contribute to this composition.</p></div></header>
      <div className="kpi-selection-toolbar linked"><label className="kpi-selection-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ScoreCard, company or department..." /></label></div>
      <div className="kpi-selection-table-wrap"><table className="kpi-selection-table linked"><thead><tr><th>Select</th><th>Availability</th><th>Code</th><th>Linked ScoreCard</th><th>Company</th><th>Department</th><th>Frequency</th><th>State</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((item) => {
          if ("configCode" in item) return null;
          const assigned = selected.includes(item.id);
          const unavailable = hidden.includes(item.id);
          const rowChecked = rowSelection.includes(item.id);
          return <tr className={rowChecked ? "selected" : ""} key={item.id} onClick={() => toggleRow(item.id)}>
            <td><input type="checkbox" checked={rowChecked} onClick={(event) => event.stopPropagation()} onChange={() => toggleRow(item.id)} aria-label={`${rowChecked ? "Unselect" : "Select"} ${item.name}`} /></td>
            <td><span className={`kpi-availability ${unavailable ? "unavailable" : assigned ? "selected" : "available"}`}>{unavailable ? "Not Available" : assigned ? "Linked to ScoreCard" : "Available to Link"}</span></td>
            <td><span className="code-pill">{item.code}</span></td><td><strong>{item.name}</strong><small>Linked contribution</small></td>
            <td>{item.company}</td><td>{item.department}</td><td>{item.frequency}</td><td><span className="kpi-active-state"><i />Active</span></td>
            <td><div className="kpi-selection-actions"><button type="button" className="view" title="View ScoreCard details" onClick={(event) => { event.stopPropagation(); setDetailId(item.id); }}><Eye size={15} /></button><button type="button" className="soft-delete" title="Soft delete linked ScoreCard" onClick={(event) => { event.stopPropagation(); softDelete(item.id, item.code); }}><Trash2 size={15} /></button></div></td>
          </tr>;
        })}
      </tbody></table></div>
      <footer className="selection-workflow-actions"><span><strong>{rowSelection.length}</strong> rows selected</span><button type="button" className="button secondary assignment-selection-back" onClick={backToAssignment}><ChevronLeft size={16} />Back to ScoreCard Assignment</button><div><button type="button" className="button clear-view" disabled={!rowSelection.some((id) => !hidden.includes(id))} onClick={hideSelectedRows}><Trash2 size={16} />Remove Selected</button><button type="button" className="button add-selected" disabled={!rowSelection.some((id) => !selected.includes(id) && !hidden.includes(id))} onClick={linkSelectedRows}><Link2 size={16} />Link Selected</button><button type="button" className="button unlink-selected" disabled={!rowSelection.some((id) => selected.includes(id))} onClick={unlinkSelectedRows}><Unlink size={16} />Unlink Selected</button></div></footer>
    </section>
    {detailsModal}
  </main>;

  /*
  return <main className="scorecard-page assignment-page assignment-selection-page">
    <nav className="kpi-breadcrumb"><Link to={`/app/scorecards/assignment?scorecardId=${scorecardId}`}>ScoreCard Assignment</Link><span>/</span><span>Select Linked ScoreCards</span></nav>
    <header className="assignment-hero">
      <div><Link2 size={23} /><h1>Link ScoreCards</h1><p>Choose other ScoreCards that contribute to this composition.</p></div>
      <button type="button" className="assignment-back" onClick={() => navigate(`/app/scorecards/assignment?scorecardId=${scorecardId}`)}><ChevronLeft size={16} /> Back to Assignment</button>
    </header>
    <section className="assignment-selection-card">
      <header><label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by ScoreCard, company or department..." /></label><strong>{selected.length} selected</strong></header>
      <div className="assignment-selection-list">
        {filtered.map((item) => {
          const checked = selected.includes(item.id);
          return <button type="button" className={checked ? "selected" : ""} key={item.id} onClick={() => toggle(item.id)}>
            <span className="assignment-select-check">{checked && <Check size={14} />}</span>
            <div><span className="code-pill">{"configCode" in item ? item.configCode : item.code}</span><strong>{item.name}</strong><small>{"category" in item ? `${item.code} · ${item.category} · ${item.source}` : `${item.company} · ${item.department} · ${item.frequency}`}</small></div>
            <em>{"goal" in item ? item.goal : "Linked ScoreCard"}</em>
          </button>;
        })}
      </div>
      <footer><button type="button" className="button" onClick={() => navigate(`/app/scorecards/assignment?scorecardId=${scorecardId}`)}>Cancel</button><button type="button" className="button primary" onClick={finish}>Apply selection ({selected.length})</button></footer>
    </section>
  </main>;
  */
}

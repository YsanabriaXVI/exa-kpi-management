import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Link2, ListChecks, Plus, Search, Target } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { scorecardService } from "./scorecard.service";
import "../kpi-pool/kpi-pool.css";
import "../kpi-pool/manage-pool-selector.css";
import "./scorecard-assignment.css";
import "./select-assignment-items.css";

type KpiOption = { poolMembershipExternalId: string; kpiConfigurationExternalId: string; definitionCode: string; definitionName: string; configurationCode: string; selectionStatus: string };
type LinkOption = { id: string; code: string; name: string; status: string; selectionStatus: string };

const formatPeriod = (periodKey: string) => {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export function SelectAssignmentItems({ type: routeType }: { type?: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scorecardId = Number(params.get("scorecardId") ?? 0);
  const periodKey = params.get("period") ?? "";
  const type = (routeType ?? params.get("type")) === "linked" ? "linked" : "kpi";
  const isKpi = type === "kpi";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const assignmentUrl = `/app/scorecards/assignment?scorecardId=${scorecardId}&period=${encodeURIComponent(periodKey)}`;
  const scorecard = useQuery({ queryKey: ["scorecard", scorecardId], queryFn: () => scorecardService.getById(scorecardId), enabled: scorecardId > 0 });
  const items = useQuery<Array<KpiOption | LinkOption>>({ queryKey: ["scorecard-available", type, scorecardId, periodKey], queryFn: async () => isKpi ? scorecardService.availableKpis(scorecardId, periodKey) : scorecardService.availableLinks(scorecardId, periodKey), enabled: scorecardId > 0 && Boolean(periodKey) });
  const visible = useMemo(() => (items.data ?? []).filter((row) => {
    const text = "definitionCode" in row ? `${row.definitionCode} ${row.definitionName} ${row.configurationCode}` : `${row.code} ${row.name} ${row.status}`;
    return text.toLowerCase().includes(search.trim().toLowerCase());
  }), [items.data, search]);
  const includedCount = (items.data ?? []).filter((row) => row.selectionStatus.startsWith("SELECTED")).length;
  const availableCount = (items.data?.length ?? 0) - includedCount;
  const add = useMutation({
    mutationFn: async () => {
      if (isKpi) return scorecardService.addKpis(scorecardId, periodKey, selected.map((poolMembershipExternalId) => ({ poolMembershipExternalId, weight: 0 })));
      for (const linkedScorecardId of selected) await scorecardService.addLink(scorecardId, periodKey, linkedScorecardId, 0);
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["scorecard-composition", scorecardId, periodKey] }), queryClient.invalidateQueries({ queryKey: ["scorecard-available", type, scorecardId, periodKey] })]);
      navigate(assignmentUrl);
    },
  });
  const title = isKpi ? "Select KPIs from Pool" : "Select Linked Scorecards";
  const itemLabel = isKpi ? "KPI Configurations" : "Scorecards";

  return <main className="pool-page manage-kpis-page assignment-selection-page">
    <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/scorecards/overview">Scorecards</Link><span>/</span><Link to={assignmentUrl}>Scorecard Assignment</Link><span>/</span><span aria-current="page">{title}</span></nav>
    <header className="pool-page-header assignment-selection-header"><div><h1>{title}</h1><p>{isKpi ? "Choose KPI Configurations from the finalized Pool Composition for this Input Period." : "Choose Scorecards to include in this Input Period composition."}</p></div></header>

    {scorecard.data && <><section className="manage-pool-identity-card" aria-label="Current Scorecard"><span>Scorecard</span><strong>{scorecard.data.code}<span aria-hidden="true"> · </span>{scorecard.data.name}</strong></section><section className="manage-compact-period-context assignment-selection-period" aria-label="Assignment period context"><div className="manage-period-selector-block"><span>Selected Input Period</span><div className="assignment-period-value">{formatPeriod(periodKey)} <small>Pool Composition Finalized</small></div><div className="manage-period-guidance"><small><strong>KPI Pool Source:</strong> {scorecard.data.poolSource}</small></div></div><button type="button" className="button secondary" onClick={() => navigate(assignmentUrl)}><ArrowLeft size={16}/> Back to Assignment</button></section></>}

    <section className="selection-summary" aria-label="Selection summary"><div className="manage-section-heading period-section-heading"><div><h2>Selection Summary for {formatPeriod(periodKey)}</h2><p>Choose a card to understand the records available below.</p></div></div><div className="availability-cards assignment-availability-cards"><div className="availability-card all"><span className="availability-card-icon"><ListChecks size={17}/></span><span><small>All {itemLabel}</small><strong>{items.data?.length ?? 0}</strong></span></div><div className="availability-card available"><span className="availability-card-icon"><Plus size={17}/></span><span><small>Available to Add</small><strong>{availableCount}</strong></span></div><div className="availability-card in_pool"><span className="availability-card-icon"><Check size={17}/></span><span><small>Included This Period</small><strong>{includedCount}</strong></span></div></div></section>

    {items.isError ? <section className="scorecard-empty-state"><h2>Eligible records could not be loaded</h2><p>{(items.error as Error).message}</p></section> : <section className="manage-table-section assignment-selection-records">
      <div className="manage-section-heading manage-table-heading"><div><h2>{title} for {formatPeriod(periodKey)}</h2><p>{isKpi ? "Only KPI Configurations from the exact finalized Pool Composition are available." : "Linked Scorecards and their weights apply only to this Input Period."}</p></div><span className="assignment-selection-heading-icon">{isKpi ? <Target size={19}/> : <Link2 size={19}/>}</span></div>
      <div className="manage-toolbar assignment-selection-toolbar"><label className="pool-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isKpi ? "Search KPI Configuration..." : "Search Scorecard..."}/></label></div>
      <div className="pool-inner-table manage-kpi-table-wrap stable-table-shell"><table className="kpi-table manage-kpi-table editable-table assignment-selection-table"><thead><tr><th>Select</th><th>Availability</th><th>{isKpi ? "Config Code" : "Scorecard Code"}</th><th>{isKpi ? "KPI Code" : "Scorecard Name"}</th><th>{isKpi ? "KPI Name" : "Lifecycle"}</th></tr></thead><tbody>
        {items.isLoading ? <tr><td colSpan={4}>Loading eligible records...</td></tr> : visible.map((row) => {
          const id = "poolMembershipExternalId" in row ? row.poolMembershipExternalId : row.id;
          const already = row.selectionStatus.startsWith("SELECTED");
          const checked = already || selected.includes(id);
          return <tr key={id} className={checked ? "selected-row" : ""}><td><input type="checkbox" disabled={already} checked={checked} aria-label={already ? "Already included" : `${checked ? "Deselect" : "Select"} record`} onChange={() => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}/></td><td><span className={`availability-label ${already ? "in_pool" : "available"}`}>{already ? "Included This Period" : "Available to Add"}</span></td><td><span className="code-pill">{"definitionCode" in row ? row.configurationCode : row.code}</span></td><td>{"definitionCode" in row ? row.definitionCode : row.name}</td><td className="name-cell">{"definitionCode" in row ? row.definitionName : <span className={`assignment-option-status ${row.status.toLowerCase()}`}>{row.status}</span>}</td></tr>;
        })}
        {!items.isLoading && !visible.length && <tr><td colSpan={4}><div className="assignment-selection-empty"><Search size={24}/><strong>No eligible records found</strong><span>Try a different search term.</span></div></td></tr>}
      </tbody></table><footer className="manage-actions assignment-selection-actions"><span><strong>{selected.length}</strong> rows selected</span><button type="button" className="button secondary manage-back-button" onClick={() => navigate(assignmentUrl)}><ArrowLeft size={16}/> Back to Assignment</button><div><button className="button pool-link-selected" disabled={!selected.length || add.isPending} onClick={() => add.mutate()}>{isKpi ? <Plus size={16}/> : <Link2 size={16}/>} {add.isPending ? "Adding..." : `Add Selected (${selected.length})`}</button></div></footer></div>
      {add.error && <p className="scorecard-form-error">{(add.error as Error).message}</p>}
    </section>}
  </main>;
}

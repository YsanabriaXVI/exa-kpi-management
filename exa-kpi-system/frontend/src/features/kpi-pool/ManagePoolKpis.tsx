import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Check, CheckCircle2, ChevronLeft, Eye, EyeOff, Hourglass, Link2, LockKeyhole, Minus, Plus, RefreshCw, Search, Settings2, TriangleAlert, Unlink, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { PoolOverviewMultiSelect } from "./PoolOverviewMultiSelect";
import { kpiPoolService } from "./kpi-pool.service";
import type { ManageablePoolKpi, PoolKpiAvailability } from "./kpi-pool.types";
import "./kpi-pool.css";
import "./manage-pool-selector.css";
import { ActionToast } from "../../components/ActionToast";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { PoolPeriodSelect } from "./PoolPeriodSelect";
import { ConfigMultiSelect } from "../kpi-config/ConfigMultiSelect";
import "../kpi-config/kpi-config-overview.css";

const availabilityCopy: Record<PoolKpiAvailability, string> = {
  AVAILABLE: "Available to Add",
  IN_POOL: "Already in Pool",
  NOT_AVAILABLE: "Not Available",
};

export function ManagePoolKpis() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const requestedPoolId = Number(params.get("poolId"));
  const poolId = requestedPoolId || 0;
  const [activeCard, setActiveCard] = useState<PoolKpiAvailability | "ALL">("AVAILABLE");
  const [search, setSearch] = useState("");
  const [definitionsSelected, setDefinitionsSelected] = useState<string[]>([]);
  const [categoriesSelected, setCategoriesSelected] = useState<string[]>([]);
  const [dataSourcesSelected, setDataSourcesSelected] = useState<string[]>([]);
  const [statesSelected, setStatesSelected] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hiddenFromView, setHiddenFromView] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: ManageSortKey; direction: SortDirection }>({ key: "configCode", direction: "asc" });
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "warning">("success");
  const [targetPeriod, setTargetPeriod] = useState("");
  const [finalizeConfirmationOpen, setFinalizeConfirmationOpen] = useState(false);
  const poolQuery = useQuery({ queryKey: ["kpi-pool", poolId], queryFn: () => kpiPoolService.get(poolId), enabled: poolId > 0 });
  const periodsQuery = useQuery({ queryKey: ["kpi-pool-periods", poolId], queryFn: () => kpiPoolService.getInputPeriods(poolId), enabled: poolId > 0 });
  useEffect(() => { if (periodsQuery.data?.meta.defaultPeriodStart) setTargetPeriod(periodsQuery.data.meta.defaultPeriodStart); }, [periodsQuery.data]);
  const editingPeriod = periodsQuery.data?.data.find((period) => period.start === targetPeriod);
  const periodIsEditable = editingPeriod?.configurationStatus === "EDITABLE";
  const periodCanFinalize = editingPeriod?.canFinalizeComposition === true;
  const isFinalized = editingPeriod?.workflowStatus === "FINALIZED";
  const targetPeriodLabel = targetPeriod ? formatMonth(targetPeriod) : "selected period";
  const catalogQuery = useQuery({ queryKey: ["pool-manage-kpis", poolId, targetPeriod], queryFn: () => periodIsEditable ? kpiPoolService.getManageableKpis(poolId, targetPeriod) : kpiPoolService.getManageableComposition(poolId, targetPeriod), enabled: poolId > 0 && Boolean(targetPeriod) && Boolean(editingPeriod) && editingPeriod?.workflowStatus !== "FUTURE" });
  const effectiveCompositionQuery = useQuery({ queryKey: ["kpi-pool-composition", poolId, targetPeriod], queryFn: () => kpiPoolService.getComposition(poolId, targetPeriod), enabled: poolId > 0 && Boolean(targetPeriod) && Boolean(editingPeriod) && editingPeriod?.workflowStatus !== "FUTURE" });
  const refresh = async () => {
    setSelected([]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pool-manage-kpis", poolId] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pool", poolId] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pools"] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pool-configuration-usage"] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pool-periods", poolId] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pool-composition", poolId] }),
    ]);
  };
  const addMutation = useMutation({
    mutationFn: (codes: string[]) => kpiPoolService.addKpis(poolId, codes, targetPeriod),
    onSuccess: async (_, codes) => { setNoticeTone("success"); setNotice(codes.length === 1 ? `${codes[0]} was linked to this Pool.` : `${codes.length} KPI Configurations were linked to this Pool.`); await refresh(); },
    onError: (mutationError) => { setNoticeTone("warning"); setNotice(mutationError instanceof Error ? mutationError.message.replace("KPI_DEFINITION_ALREADY_ASSIGNED: ", "") : "The selected KPI Configurations could not be linked."); },
  });
  const removeMutation = useMutation({ mutationFn: (codes: string[]) => kpiPoolService.removeKpis(poolId, codes, targetPeriod, poolQuery.data?.status), onSuccess: async (_, codes) => { setNotice(codes.length === 1 ? `${codes[0]} was retired from the selected period.` : `${codes.length} KPI Configurations were retired from the selected period.`); await refresh(); } });
  const replaceMutation = useMutation({
    mutationFn: async (candidate: ManageablePoolKpi) => {
      const current = records.find((record) => record.configCode === candidate.conflictingConfigurationCode && record.availability === "IN_POOL");
      if (!current?.configurationId || !candidate.configurationId) throw new Error("The current or replacement Configuration could not be resolved.");
      return kpiPoolService.replaceKpi(poolId, current.configurationId, candidate.configurationId, targetPeriod);
    },
    onSuccess: async () => { setNoticeTone("success"); setNotice(`KPI Configuration replaced for ${formatMonthLong(targetPeriod)}.`); await refresh(); },
    onError: (error) => { setNoticeTone("warning"); setNotice(error instanceof Error ? error.message : "The KPI Configuration could not be replaced."); },
  });
  const finalizeMutation = useMutation({
    mutationFn: () => kpiPoolService.finalizePeriodComposition(poolId, targetPeriod),
    onSuccess: async (result) => { setFinalizeConfirmationOpen(false); setNoticeTone("success"); setNotice(`${formatMonth(result.data.periodStart)} composition was finalized with ${result.data.kpiCount} KPI ${result.data.kpiCount === 1 ? "Configuration" : "Configurations"}.`); await refresh(); },
    onError: (error) => { setNoticeTone("warning"); setNotice(error instanceof Error ? error.message : "The period composition could not be finalized."); },
  });
  const records = catalogQuery.data ?? [];
  const includedCount = effectiveCompositionQuery.data?.length ?? 0;
  const isFirstInputPeriod = periodsQuery.data?.data[0]?.start === targetPeriod;
  const finalizeBlockedReason = getFinalizeBlockedReason({
    compositionLoading: effectiveCompositionQuery.isLoading,
    includedCount,
    periodCanFinalize,
    previousPeriodStart: editingPeriod?.dependency.previousPeriodStart ?? null,
  });
  useEffect(() => { if (!editingPeriod) return; setActiveCard(editingPeriod.workflowStatus === "FINALIZED" ? "IN_POOL" : "AVAILABLE"); setPage(1); setSelected([]); setHiddenFromView([]); }, [editingPeriod?.start, editingPeriod?.workflowStatus]);
  const counts = {
    AVAILABLE: records.filter((item) => item.availability === "AVAILABLE").length,
    IN_POOL: records.filter((item) => item.availability === "IN_POOL").length,
    NOT_AVAILABLE: records.filter((item) => item.availability === "NOT_AVAILABLE").length,
  };
  const filtered = useMemo(() => records.filter((record) => {
    const term = search.toLowerCase();
    return !hiddenFromView.includes(record.configCode)
      && (activeCard === "ALL" || record.availability === activeCard)
      && (!term || `${record.configCode} ${record.kpiCode} ${record.name}`.toLowerCase().includes(term))
      && (!definitionsSelected.length || definitionsSelected.includes(record.definitionId))
      && (!categoriesSelected.length || categoriesSelected.includes(record.category))
      && (!dataSourcesSelected.length || dataSourcesSelected.includes(record.dataSource))
      && (!statesSelected.length || statesSelected.includes(record.status));
  }).sort((left, right) => compareSortValues(left[sort.key], right[sort.key], sort.direction)), [activeCard, categoriesSelected, dataSourcesSelected, definitionsSelected, hiddenFromView, records, search, sort, statesSelected]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);
  const filterAnimationKey = [
    activeCard,
    search,
    definitionsSelected.join(","),
    hiddenFromView.join(","),
    categoriesSelected.join(","),
    dataSourcesSelected.join(","),
    statesSelected.join(","),
    page,
  ].join("|");
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  const sortBy = (key: ManageSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };
  const toggle = (code: string) => setSelected((current) => {
    if (current.includes(code)) return current.filter((item) => item !== code);
    const candidate = records.find((item) => item.configCode === code);
    if (!candidate) return current;
    if (candidate.reasonCode === "KPI_DEFINITION_ALREADY_EFFECTIVE") {
      setNoticeTone("warning");
      setNotice(`${candidate.kpiCode} is already represented by ${candidate.conflictingConfigurationCode ?? "another KPI Configuration"} in this period. Retire or replace it for the target period before selecting ${candidate.configCode}.`);
      return current;
    }
    const alreadyInPool = (poolQuery.data?.kpis ?? []).some((item) => item.definitionId === candidate.definitionId && item.configCode !== code);
    const alreadySelected = current.some((selectedCode) => records.find((item) => item.configCode === selectedCode)?.definitionId === candidate.definitionId);
    if (alreadyInPool || alreadySelected) {
      setNoticeTone("warning");
      const conflicting = records.find((item) => current.includes(item.configCode) && item.definitionId === candidate.definitionId)?.configCode;
      setNotice(`${candidate.kpiCode} can only have one Configuration in this Pool. Deselect ${conflicting ?? "the other selected Configuration"} before selecting ${candidate.configCode}.`);
      return current;
    }
    return [...current, code];
  });
  const selectedAvailable = selected.filter((code) => records.find((item) => item.configCode === code)?.availability === "AVAILABLE");
  const selectedIncluded = selected.filter((code) => records.find((item) => item.configCode === code)?.availability === "IN_POOL");
  return (
    <main className="pool-page manage-kpis-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/pool-kpis/overview">KPI Pool</Link>{poolQuery.data && <><span>/</span><Link to={`/app/pool-kpis/detail/${poolId}`}>{poolQuery.data.code}</Link></>}<span>/</span><Link to={poolId ? `/app/pool-kpis/manage-kpis?poolId=${poolId}` : "/app/pool-kpis/manage-kpis"} aria-current="page">Manage KPIs</Link></nav>
      <header className="pool-page-header"><div><h1>Manage KPIs</h1><p>Prepare the KPI Configuration universe for the selected Pool period.</p></div></header>

      {!poolId && <section className="manage-pool-empty"><h2>No KPI Pool selected</h2><p>Open Manage KPIs from the corresponding record in KPI Pool Overview.</p></section>}

      {poolId > 0 && poolQuery.isLoading && <section className="manage-pool-loading"><span /><p>Loading KPI Pool records...</p></section>}

      {poolQuery.data && <section className="manage-pool-identity-card" aria-label="Current KPI Pool">
        <span>KPI Pool</span>
        <strong>{poolQuery.data.code}<span aria-hidden="true"> · </span>{poolQuery.data.name}</strong>
      </section>}

      {poolId > 0 && !poolQuery.isLoading && <div className={`manage-pool-loaded ${editingPeriod?.workflowStatus === "FUTURE" ? "future-period" : editingPeriod?.workflowStatus === "FINALIZED" ? "finalized-period" : "editable-period"}`} key={poolId}>
      {poolQuery.data && <section className="manage-compact-period-context" aria-label="Composition period context">
        <div className="manage-period-selector-block"><span>Select Pool Period</span><PoolPeriodSelect periods={periodsQuery.data?.data ?? []} value={targetPeriod} onChange={(period) => { setTargetPeriod(period); setSelected([]); }}/><div className="manage-period-guidance">{isFinalized ? <small className="finalized-period-note"><Check size={15} aria-hidden="true"/><span><strong>{formatMonthLong(targetPeriod)} finalized</strong> — {records.length} KPI {records.length === 1 ? "Configuration is" : "Configurations are"} available to Scorecards. This composition is read-only.</span></small> : isFirstInputPeriod && periodIsEditable ? <small className="first-period-note"><CheckCircle2 size={15} aria-hidden="true"/><span><strong>This is the first Input Period of the Pool.</strong> The composition can be finalized once you have selected the KPI Configurations that should be available to Scorecards.</span></small> : periodCanFinalize ? <small><strong>Editable composition.</strong> You can add, remove or replace KPI Configurations for this period.</small> : periodIsEditable ? <><small><strong>You may continue preparing this composition.</strong></small><small className="finalization-warning"><TriangleAlert size={15} aria-hidden="true"/> <span>Finalization will become available after {editingPeriod?.dependency.previousPeriodStart ? formatMonthLong(editingPeriod.dependency.previousPeriodStart) : "the previous period"} Monitoring is closed.</span></small></> : <small>This composition is not available yet.</small>}</div></div>
        <button className="button secondary" onClick={() => navigate(`/app/pool-kpis/period-schedule?poolId=${poolId}`)}><CalendarRange size={16}/> View Period Schedule</button>
      </section>}

      {editingPeriod?.workflowStatus === "FUTURE" && <section className="future-composition-empty"><Hourglass size={34} /><span className="selected-period-badge">{formatMonthOption(targetPeriod)} · Future</span><h2>KPI composition not available yet</h2><p>Complete the previous period workflow before this composition becomes available.</p><strong>Current editable composition: {formatMonthLong(periodsQuery.data?.meta.defaultPeriodStart ?? targetPeriod)}</strong><button className="button secondary" onClick={() => setTargetPeriod(periodsQuery.data?.meta.defaultPeriodStart ?? targetPeriod)}>Back to editable period</button></section>}

      {editingPeriod?.workflowStatus !== "FUTURE" && <><section className="selection-summary">
        <div className="manage-section-heading period-section-heading"><div><h2>Selection Summary for {targetPeriod ? formatMonthLong(targetPeriod) : "Selected Period"}</h2><p>Choose a card to filter the records below.</p></div></div>
        <div className="availability-cards">
          <button className={`availability-card all ${activeCard === "ALL" ? "active" : ""}`} onClick={() => setActiveCard("ALL")} aria-pressed={activeCard === "ALL"}><span className="availability-card-icon"><Settings2 size={17} /></span><span><small>All Configurations</small><strong>{records.length}</strong></span></button>
          <AvailabilityCard type="AVAILABLE" count={counts.AVAILABLE} active={activeCard === "AVAILABLE"} onClick={() => setActiveCard(activeCard === "AVAILABLE" ? "ALL" : "AVAILABLE")} />
          <AvailabilityCard type="IN_POOL" label="Included This Period" count={counts.IN_POOL} active={activeCard === "IN_POOL"} onClick={() => setActiveCard(activeCard === "IN_POOL" ? "ALL" : "IN_POOL")} />
          <AvailabilityCard type="NOT_AVAILABLE" count={counts.NOT_AVAILABLE} active={activeCard === "NOT_AVAILABLE"} onClick={() => setActiveCard(activeCard === "NOT_AVAILABLE" ? "ALL" : "NOT_AVAILABLE")} />
        </div>
      </section>

      <section className="manage-table-section">
        <div className="manage-section-heading manage-table-heading"><div><h2>{isFinalized ? "Composition Snapshot" : "Manage KPI Configurations"} for {targetPeriod ? formatMonthLong(targetPeriod) : "Selected Period"}</h2><p>{isFinalized ? "Read-only KPI composition finalized for this Input Period." : "Add, remove or replace KPI Configurations for this period."}</p></div><div className="manage-table-heading-actions">{poolQuery.data?.status !== "INACTIVE" && periodIsEditable && <div className="table-finalize-control"><button className="button finalize-period-button" disabled={Boolean(finalizeBlockedReason) || finalizeMutation.isPending} title={finalizeBlockedReason ?? undefined} onClick={() => setFinalizeConfirmationOpen(true)}>{finalizeMutation.isPending ? "Finalizing…" : <><Check size={15}/> Finalize Composition</>}</button><small className={editingPeriod?.dependency.previousPeriodStart && !periodCanFinalize ? "finalize-blocked-message" : !finalizeBlockedReason ? "finalize-ready-message" : undefined}>{editingPeriod?.dependency.previousPeriodStart && !periodCanFinalize ? <TriangleAlert size={15} aria-hidden="true"/> : !finalizeBlockedReason ? <CheckCircle2 size={14} aria-hidden="true"/> : null}<span>{finalizeBlockedReason ?? "The selected set will become read-only for this Input Period."}</span></small></div>}</div></div>
        <div className="manage-toolbar">
          <label className="pool-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search KPI name, code or category..." /></label>
          <div className="manage-definition-filter kpi-config-page"><ConfigMultiSelect label="KPI Definition" searchable options={[...new Map(records.map((record) => [record.definitionId, { value: record.definitionId, label: record.kpiCode, description: record.name }])).values()]} selected={definitionsSelected} onChange={setDefinitionsSelected} /></div>
          <PoolOverviewMultiSelect label="All categories" options={[...new Set(records.map((record) => record.category))].map((item) => ({ value: item, label: item }))} selected={categoriesSelected} onChange={setCategoriesSelected} />
          <PoolOverviewMultiSelect label="All data sources" options={[...new Set(records.map((record) => record.dataSource))].map((item) => ({ value: item, label: item }))} selected={dataSourcesSelected} onChange={setDataSourcesSelected} />
          <PoolOverviewMultiSelect label="All states" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} selected={statesSelected} onChange={setStatesSelected} />
        </div>
        {notice && <ActionToast message={notice} tone={noticeTone} onClose={() => setNotice("")} />}
        <div className="pool-inner-table manage-kpi-table-wrap stable-table-shell">
          <table className={`kpi-table manage-kpi-table ${isFinalized ? "snapshot-table" : "editable-table"}`}>
            <thead><tr>
              {!isFinalized && <><th>Select</th><SortableTableHeader active={sort.key === "availability"} direction={sort.direction} onSort={() => sortBy("availability")}>Availability</SortableTableHeader></>}
              <SortableTableHeader active={sort.key === "configCode"} direction={sort.direction} onSort={() => sortBy("configCode")}>Config Code</SortableTableHeader>
              <SortableTableHeader active={sort.key === "kpiCode"} direction={sort.direction} onSort={() => sortBy("kpiCode")}>KPI Code</SortableTableHeader>
              <SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>KPI Name</SortableTableHeader>
              <SortableTableHeader active={sort.key === "category"} direction={sort.direction} onSort={() => sortBy("category")}>Category</SortableTableHeader>
              <SortableTableHeader active={sort.key === "goal"} direction={sort.direction} onSort={() => sortBy("goal")}>Goal</SortableTableHeader>
              <SortableTableHeader active={sort.key === "measurementUnit"} direction={sort.direction} onSort={() => sortBy("measurementUnit")}>M. Unit</SortableTableHeader>
              <SortableTableHeader active={sort.key === "dataSource"} direction={sort.direction} onSort={() => sortBy("dataSource")}>Data Source</SortableTableHeader>
              <SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>State</SortableTableHeader>
              <th>Actions</th>
            </tr></thead>
            <tbody key={filterAnimationKey}>{catalogQuery.isLoading ? <tr><td colSpan={isFinalized ? 9 : 11} className="table-message">Loading KPI Configurations...</td></tr> : paginated.length ? paginated.map((record) => (
              <tr key={record.configCode} className={`${selected.includes(record.configCode) ? "selected-row" : ""} ${record.reasonCode === "KPI_DEFINITION_ALREADY_EFFECTIVE" ? "definition-conflict-row" : ""}`}>
                {!isFinalized && <><td><input type="checkbox" disabled={record.availability === "NOT_AVAILABLE"} checked={selected.includes(record.configCode)} onChange={() => toggle(record.configCode)} aria-label={`Select ${record.configCode}${record.reasonCode === "KPI_DEFINITION_ALREADY_EFFECTIVE" ? `. Another configuration of ${record.kpiCode} is already selected for this period.` : ""}`} title={availabilityReason(record)} /></td><td><span title={availabilityReason(record)} className={`availability-label ${record.availability.toLowerCase()}`}>{availabilityCopy[record.availability]}</span></td></>}
                <td><span className="code-pill">{record.configCode}</span></td><td>{record.kpiCode}</td><td className="name-cell">{record.name}</td><td>{record.category}</td><td>{record.goal}</td><td>{record.measurementUnit}</td><td>{record.dataSource}</td>
                <td><span className={`status-chip ${record.status.toLowerCase()}`}><i />{record.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                <td><div className="table-actions">
                  <button className="icon-button view" title="View KPI Configuration detail" onClick={() => navigate(`/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(record.configCode)}&poolId=${poolId}&from=pool-manage`)}><Eye size={15} /></button>
                  {periodIsEditable && record.reasonCode === "KPI_DEFINITION_ALREADY_EFFECTIVE" && record.conflictingConfigurationCode && <button className="icon-button configure" disabled={replaceMutation.isPending} title={`Replace ${record.conflictingConfigurationCode} with ${record.configCode} for ${formatMonthLong(targetPeriod)}`} aria-label={`Replace ${record.conflictingConfigurationCode} with ${record.configCode}`} onClick={() => { if (window.confirm(`Replace ${record.conflictingConfigurationCode} with ${record.configCode} for ${formatMonthLong(targetPeriod)}?`)) replaceMutation.mutate(record); }}><RefreshCw size={15}/></button>}
                </div></td>
              </tr>
            )) : <tr><td colSpan={isFinalized ? 9 : 11} className="table-message">No KPI Configurations match these filters.</td></tr>}</tbody>
          </table>
          <div className="manage-table-footer">
            <footer className="manage-table-pagination">
              <span>Showing <strong>{filtered.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> records</span>
              <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
              <PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="Manage KPI Pool pagination" className="manage-pagination-controls" />
            </footer>
            <footer className="manage-actions">
              <span><strong>{selected.length}</strong> rows selected</span>
              <button className="button secondary manage-back-button" onClick={() => navigate(`/app/pool-kpis/detail/${poolId}`)}><ChevronLeft size={15} /> Back to KPI Pool</button>
              <div>
                <button className="button pool-link-selected" disabled={!periodIsEditable || !selectedAvailable.length || addMutation.isPending} onClick={() => addMutation.mutate(selectedAvailable)}><Link2 size={15} /> Add to {targetPeriodLabel}</button>
                <button className="button pool-unlink-selected" disabled={!periodIsEditable || !selectedIncluded.length || removeMutation.isPending} title={!periodIsEditable ? "Finalized and future compositions cannot be modified." : !selectedIncluded.length ? "Select one or more included KPI Configurations." : undefined} onClick={() => { if (window.confirm(`Remove ${selectedIncluded.length} selected KPI ${selectedIncluded.length === 1 ? "Configuration" : "Configurations"} from ${formatMonthLong(targetPeriod)}? They will return to Available to Add.`)) removeMutation.mutate(selectedIncluded); }}><Unlink size={15} /> {removeMutation.isPending ? "Removing…" : `Return to Available (${selectedIncluded.length})`}</button>
                <button className="button secondary pool-hide-selected" disabled={!selected.length} title={!selected.length ? "Select one or more visible rows." : "Hide selected rows from this table without changing the Pool composition."} onClick={() => { setHiddenFromView((current) => [...new Set([...current, ...selected])]); setSelected([]); setNoticeTone("success"); setNotice("Selected rows were hidden from this view. The Pool composition was not changed."); }}><EyeOff size={15} /> Hide from List ({selected.length})</button>
              </div>
            </footer>
          </div>
        </div>
      </section></>}
      </div>}

      {finalizeConfirmationOpen && poolQuery.data && <div className="pool-modal-backdrop" role="presentation"><section className="finalize-composition-modal" role="dialog" aria-modal="true" aria-labelledby="finalize-composition-title"><header><span><LockKeyhole size={21}/></span><div><h2 id="finalize-composition-title">Finalize {formatMonthLong(targetPeriod)} Composition?</h2><p>{includedCount} KPI {includedCount === 1 ? "Configuration" : "Configurations"}</p></div><button type="button" aria-label="Close confirmation" onClick={() => setFinalizeConfirmationOpen(false)} disabled={finalizeMutation.isPending}><X size={18}/></button></header><p>These KPI Configurations will become available to Scorecards for {formatMonthLong(targetPeriod)}.</p><dl><div><dt>Pool</dt><dd>{poolQuery.data.code} · {poolQuery.data.name}</dd></div><div><dt>Input Period</dt><dd>{formatMonthLong(targetPeriod)}</dd></div><div><dt>KPI Configurations</dt><dd>{includedCount}</dd></div><div><dt>Companies</dt><dd>{poolQuery.data.companies.join(", ")}</dd></div><div><dt>Validity</dt><dd>{formatMonthLong(poolQuery.data.validFrom)} – {formatMonthLong(poolQuery.data.validTo)}</dd></div><div><dt>Frequency</dt><dd>{poolQuery.data.frequency}</dd></div></dl>{isFirstInputPeriod && <section className="finalize-next-steps"><h3>What happens next?</h3><ul><li>The Pool becomes Active.</li><li>These KPI Configurations become available to Scorecards for this Input Period.</li><li>Pool validity, frequency, companies and structural scope become locked.</li><li>The finalized composition becomes read-only.</li></ul><p>Future period compositions can still be prepared according to the Pool workflow.</p></section>}<footer><button className="button secondary" onClick={() => setFinalizeConfirmationOpen(false)} disabled={finalizeMutation.isPending}>Cancel</button><button className="button primary" onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>{finalizeMutation.isPending ? "Finalizing…" : "Finalize Composition"}</button></footer></section></div>}

    </main>
  );
}

type ManageSortKey = keyof Pick<ManageablePoolKpi, "availability" | "configCode" | "kpiCode" | "name" | "category" | "goal" | "measurementUnit" | "dataSource" | "status">;

export function getFinalizeBlockedReason({ compositionLoading, includedCount, periodCanFinalize, previousPeriodStart }: { compositionLoading: boolean; includedCount: number; periodCanFinalize: boolean; previousPeriodStart: string | null }) {
  if (compositionLoading) return "Checking the effective Pool composition…";
  if (includedCount === 0) return "Add at least one KPI Configuration to this Input Period before finalizing.";
  if (periodCanFinalize) return null;
  if (previousPeriodStart) return `Waiting for ${formatMonthLong(previousPeriodStart)} Monitoring to close.`;
  return "Finalization eligibility could not be confirmed. Refresh the period and try again.";
}

function AvailabilityCard({ type, label, count, active, onClick }: { type: PoolKpiAvailability; label?: string; count: number; active: boolean; onClick: () => void }) {
  return <button className={`availability-card ${type.toLowerCase()} ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}><span className="availability-card-icon">{type === "AVAILABLE" ? <Plus size={17} /> : type === "IN_POOL" ? <Check size={17} /> : <Minus size={17} />}</span><span><small>{label ?? availabilityCopy[type]}</small><strong>{count}</strong></span></button>;
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatMonthLong(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatMonthOption(value: string) {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date);
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "UTC" }).format(date);
  return `${month} • ${year}`;
}

function availabilityReason(record: ManageablePoolKpi) {
  if (record.reasonCode === "KPI_DEFINITION_ALREADY_EFFECTIVE") return `Another configuration of ${record.kpiCode} is already selected for this period${record.conflictingConfigurationCode ? `: ${record.conflictingConfigurationCode}` : ""}.`;
  return record.reasonCode?.replace(/_/g, " ") ?? undefined;
}

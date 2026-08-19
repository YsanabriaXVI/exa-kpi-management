import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, CircleHelp, Eye, Link2, Minus, PackagePlus, Plus, Search, Settings2, Trash2, Unlink, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DetailRecordSelector } from "../../components/DetailRecordSelector";
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

const availabilityCopy: Record<PoolKpiAvailability, string> = {
  AVAILABLE: "Available to Select",
  IN_POOL: "Already in Pool",
  NOT_AVAILABLE: "Not Available",
};

export function ManagePoolKpis() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const lockedPool = params.get("source") === "overview";
  const requestedPoolId = Number(params.get("poolId"));
  const storedPoolId = Number(window.localStorage.getItem("exa:manage-kpis:selected-pool"));
  const poolId = requestedPoolId || (!lockedPool ? storedPoolId : 0) || 0;
  const [activeCard, setActiveCard] = useState<PoolKpiAvailability | "ALL">("AVAILABLE");
  const [search, setSearch] = useState("");
  const [categoriesSelected, setCategoriesSelected] = useState<string[]>([]);
  const [dataSourcesSelected, setDataSourcesSelected] = useState<string[]>([]);
  const [statesSelected, setStatesSelected] = useState<string[]>([]);
  const [measurementUnitsSelected, setMeasurementUnitsSelected] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: ManageSortKey; direction: SortDirection }>({ key: "configCode", direction: "asc" });
  const [showImporter, setShowImporter] = useState(false);
  const [importSelection, setImportSelection] = useState<string[]>([]);
  const [importSearch, setImportSearch] = useState("");
  const [showRecentKpis, setShowRecentKpis] = useState(false);
  const [importStatusFilter, setImportStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [importCategoryFilter, setImportCategoryFilter] = useState("ALL");
  const [importDataSourceFilter, setImportDataSourceFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "warning">("success");
  const normalizedImportSearch = importSearch.trim();
  const poolsQuery = useQuery({ queryKey: ["kpi-pools"], queryFn: kpiPoolService.list });
  const poolOptions = (poolsQuery.data ?? []).map((pool) => ({
    id: String(pool.id),
    code: pool.code,
    name: pool.name,
    meta: `${pool.companies.join(", ")} · ${pool.frequency}`,
  }));
  const selectPool = (id: string | null) => {
    if (lockedPool) return;
    if (!id) {
      window.localStorage.removeItem("exa:manage-kpis:selected-pool");
      setSelected([]);
      setPage(1);
      setParams({}, { replace: true });
      return;
    }
    window.localStorage.setItem("exa:manage-kpis:selected-pool", id);
    setSelected([]);
    setPage(1);
    setParams({ poolId: id }, { replace: true });
  };
  useEffect(() => {
    if (!lockedPool && poolId) window.localStorage.setItem("exa:manage-kpis:selected-pool", String(poolId));
  }, [lockedPool, poolId]);
  const poolQuery = useQuery({ queryKey: ["kpi-pool", poolId], queryFn: () => kpiPoolService.get(poolId), enabled: poolId > 0 });
  const catalogQuery = useQuery({ queryKey: ["pool-manage-kpis", poolId], queryFn: () => kpiPoolService.getManageableKpis(poolId), enabled: poolId > 0 });
  const importableQuery = useQuery({
    queryKey: ["importable-kpis", normalizedImportSearch, showRecentKpis],
    queryFn: () => kpiPoolService.getImportableKpis(normalizedImportSearch, showRecentKpis),
    enabled: showImporter && (normalizedImportSearch.length > 0 || showRecentKpis),
  });
  const refresh = async () => {
    setSelected([]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pool-manage-kpis", poolId] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pool", poolId] }),
      queryClient.invalidateQueries({ queryKey: ["kpi-pools"] }),
    ]);
  };
  const addMutation = useMutation({
    mutationFn: (codes: string[]) => kpiPoolService.addKpis(poolId, codes),
    onSuccess: async (_, codes) => { setNoticeTone("success"); setNotice(codes.length === 1 ? `${codes[0]} was linked to this Pool.` : `${codes.length} KPI Configurations were linked to this Pool.`); await refresh(); },
    onError: (mutationError) => { setNoticeTone("warning"); setNotice(mutationError instanceof Error ? mutationError.message.replace("KPI_DEFINITION_ALREADY_ASSIGNED: ", "") : "The selected KPI Configurations could not be linked."); },
  });
  const removeMutation = useMutation({ mutationFn: (codes: string[]) => kpiPoolService.removeKpis(poolId, codes), onSuccess: async (_, codes) => { setNotice(codes.length === 1 ? `${codes[0]} was unlinked from this Pool.` : `${codes.length} KPI Configurations were unlinked from this Pool.`); await refresh(); } });
  const hideMutation = useMutation({
    mutationFn: (codes: string[]) => kpiPoolService.hideKpisFromPool(poolId, codes),
    onSuccess: async (_, codes) => {
      setNoticeTone("warning");
      setNotice(`Removal successful: ${codes.length} KPI ${codes.length === 1 ? "Configuration was" : "Configurations were"} removed from this Pool view.`);
      await refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: kpiPoolService.softDeleteKpi,
    onSuccess: async () => {
      setNotice("KPI Configuration was soft deleted and unlinked from active Pools.");
      await refresh();
    },
  });
  const importMutation = useMutation({
    mutationFn: kpiPoolService.importKpis,
    onSuccess: async (imported) => {
      setShowImporter(false);
      setImportSearch("");
      setShowRecentKpis(false);
      setImportSelection([]);
      setImportStatusFilter("ACTIVE");
      setImportCategoryFilter("ALL");
      setImportDataSourceFilter("ALL");
      setNotice(`${imported.length} KPI ${imported.length === 1 ? "Configuration was" : "Configurations were"} brought into the Manage KPIs table.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pool-manage-kpis", poolId] }),
        queryClient.invalidateQueries({ queryKey: ["importable-kpis"] }),
      ]);
    },
  });
  const records = catalogQuery.data ?? [];
  const recordCodes = new Set(records.map((record) => record.configCode));
  const recoverableKpis = (importableQuery.data ?? []).filter((kpi) => !recordCodes.has(kpi.configCode));
  const importCategories = [...new Set(recoverableKpis.map((kpi) => kpi.category))].sort();
  const importDataSources = [...new Set(recoverableKpis.map((kpi) => kpi.dataSource))].sort();
  const importable = recoverableKpis.filter((kpi) =>
    (importStatusFilter === "ALL" || kpi.status === importStatusFilter)
    && (importCategoryFilter === "ALL" || kpi.category === importCategoryFilter)
    && (importDataSourceFilter === "ALL" || kpi.dataSource === importDataSourceFilter),
  );
  const counts = {
    AVAILABLE: records.filter((item) => item.availability === "AVAILABLE").length,
    IN_POOL: records.filter((item) => item.availability === "IN_POOL").length,
    NOT_AVAILABLE: records.filter((item) => item.availability === "NOT_AVAILABLE").length,
  };
  const filtered = useMemo(() => records.filter((record) => {
    const term = search.toLowerCase();
    return (activeCard === "ALL" || record.availability === activeCard)
      && (!term || `${record.configCode} ${record.kpiCode} ${record.name}`.toLowerCase().includes(term))
      && (!categoriesSelected.length || categoriesSelected.includes(record.category))
      && (!dataSourcesSelected.length || dataSourcesSelected.includes(record.dataSource))
      && (!statesSelected.length || statesSelected.includes(record.status))
      && (!measurementUnitsSelected.length || measurementUnitsSelected.includes(record.measurementUnit));
  }).sort((left, right) => compareSortValues(left[sort.key], right[sort.key], sort.direction)), [activeCard, categoriesSelected, dataSourcesSelected, measurementUnitsSelected, records, search, sort, statesSelected]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);
  const filterAnimationKey = [
    activeCard,
    search,
    categoriesSelected.join(","),
    dataSourcesSelected.join(","),
    statesSelected.join(","),
    measurementUnitsSelected.join(","),
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
    const alreadyInPool = (poolQuery.data?.kpis ?? []).some((item) => item.definitionId === candidate.definitionId && item.configCode !== code);
    const alreadySelected = current.some((selectedCode) => records.find((item) => item.configCode === selectedCode)?.definitionId === candidate.definitionId);
    if (alreadyInPool || alreadySelected) {
      setNoticeTone("warning");
      setNotice(`${candidate.kpiCode} is already represented in this Pool. Select only one configuration per KPI Definition.`);
      return current;
    }
    return [...current, code];
  });
  const selectedAvailable = selected.filter((code) => records.find((item) => item.configCode === code)?.availability === "AVAILABLE");
  const selectedIncluded = selected.filter((code) => records.find((item) => item.configCode === code)?.availability === "IN_POOL");
  return (
    <main className="pool-page manage-kpis-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/pool-kpis/overview">KPI Pool</Link><span>/</span><Link to={poolId ? `/app/pool-kpis/manage-kpis?poolId=${poolId}` : "/app/pool-kpis/manage-kpis"} aria-current="page">Manage KPIs</Link></nav>
      <header className="pool-page-header"><div><h1>Manage KPIs</h1><p>Select the KPI Configurations that will form part of this Pool.</p></div></header>

      <DetailRecordSelector
        label={lockedPool ? "Selected KPI Pool" : "KPI Pool"}
        placeholder={lockedPool ? "Selected KPI Pool" : "Select Option"}
        emptyLabel="No KPI Pool selected"
        options={poolOptions}
        selectedId={poolId ? String(poolId) : null}
        onSelect={selectPool}
        disabled={lockedPool}
        allowEmpty={false}
        suggestOnlyAfterTyping
        clearSelectionOnEmpty
        disabledMessage={lockedPool ? "Este Pool fue abierto desde KPI Pool Overview. Regresa al Overview para seleccionar otro Pool." : undefined}
      />

      {!poolId && <section className="manage-pool-empty"><h2>No data found</h2></section>}

      {poolId > 0 && (poolQuery.isLoading || catalogQuery.isLoading) && <section className="manage-pool-loading"><span /><p>Loading KPI Pool records...</p></section>}

      {poolId > 0 && !poolQuery.isLoading && !catalogQuery.isLoading && <div className="manage-pool-loaded" key={poolId}>
      {poolQuery.data && <section className="manage-context">
        <div><span>Current Pool</span><strong>{poolQuery.data.name}</strong></div>
        <div><span>Companies</span><strong>{poolQuery.data.companies.join(", ")}</strong></div>
        <div><span>Suggested Frequency</span><strong>{poolQuery.data.frequency}</strong></div>
        <div><span>Validity</span><strong>{formatMonth(poolQuery.data.validFrom)} – {formatMonth(poolQuery.data.validTo)}</strong></div>
      </section>}

      <section className="selection-summary">
        <div className="manage-section-heading"><h2>Selection Summary</h2><p>Choose a card to filter the records below.</p></div>
        <div className="availability-cards">
          <button className={`availability-card all ${activeCard === "ALL" ? "active" : ""}`} onClick={() => setActiveCard("ALL")} aria-pressed={activeCard === "ALL"}><span className="availability-card-icon"><Settings2 size={17} /></span><span><small>All KPI Configurations</small><strong>{records.length}</strong></span></button>
          <AvailabilityCard type="AVAILABLE" count={counts.AVAILABLE} active={activeCard === "AVAILABLE"} onClick={() => setActiveCard(activeCard === "AVAILABLE" ? "ALL" : "AVAILABLE")} />
          <AvailabilityCard type="IN_POOL" count={counts.IN_POOL} active={activeCard === "IN_POOL"} onClick={() => setActiveCard(activeCard === "IN_POOL" ? "ALL" : "IN_POOL")} />
          <AvailabilityCard type="NOT_AVAILABLE" count={counts.NOT_AVAILABLE} active={activeCard === "NOT_AVAILABLE"} onClick={() => setActiveCard(activeCard === "NOT_AVAILABLE" ? "ALL" : "NOT_AVAILABLE")} />
        </div>
      </section>

      <section className="manage-table-section">
        <div className="manage-section-heading manage-table-heading"><div><h2>Manage KPI Configurations for this Pool</h2><p>Bring configurations into this list, then assign the available ones to the current Pool.</p></div><button className="button bring-kpi-button" onClick={() => setShowImporter(true)}><PackagePlus size={18} /> Bring KPI Lines</button></div>
        <div className="manage-toolbar">
          <label className="pool-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search KPI name, code or category..." /></label>
          <PoolOverviewMultiSelect label="All categories" options={[...new Set(records.map((record) => record.category))].map((item) => ({ value: item, label: item }))} selected={categoriesSelected} onChange={setCategoriesSelected} />
          <PoolOverviewMultiSelect label="All data sources" options={[...new Set(records.map((record) => record.dataSource))].map((item) => ({ value: item, label: item }))} selected={dataSourcesSelected} onChange={setDataSourcesSelected} />
          <PoolOverviewMultiSelect label="All states" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} selected={statesSelected} onChange={setStatesSelected} />
          <PoolOverviewMultiSelect label="Measurement Unit" options={[...new Set(records.map((record) => record.measurementUnit))].sort().map((item) => ({ value: item, label: formatMeasurementUnit(item) }))} selected={measurementUnitsSelected} onChange={setMeasurementUnitsSelected} />
        </div>
        {notice && <ActionToast message={notice} tone={noticeTone} onClose={() => setNotice("")} />}
        <div className="pool-inner-table manage-kpi-table-wrap stable-table-shell">
          <table className="kpi-table manage-kpi-table">
            <thead><tr>
              <th>Select</th>
              <SortableTableHeader active={sort.key === "availability"} direction={sort.direction} onSort={() => sortBy("availability")}>Availability</SortableTableHeader>
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
            <tbody key={filterAnimationKey}>{catalogQuery.isLoading ? <tr><td colSpan={11} className="table-message">Loading KPI Configurations...</td></tr> : paginated.length ? paginated.map((record) => (
              <tr key={record.configCode} className={selected.includes(record.configCode) ? "selected-row" : ""}>
                <td><input type="checkbox" checked={selected.includes(record.configCode)} onChange={() => toggle(record.configCode)} aria-label={`Select ${record.configCode}`} /></td>
                <td><span className={`availability-label ${record.availability.toLowerCase()}`}>{availabilityCopy[record.availability]}</span></td>
                <td><span className="code-pill">{record.configCode}</span></td><td>{record.kpiCode}</td><td className="name-cell">{record.name}</td><td>{record.category}</td><td>{record.goal}</td><td>{record.measurementUnit}</td><td>{record.dataSource}</td>
                <td><span className={`status-chip ${record.status.toLowerCase()}`}><i />{record.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                <td><div className="table-actions">
                  <button className="icon-button delete" title="Soft delete KPI Configuration" disabled={record.status === "INACTIVE" || deleteMutation.isPending} onClick={() => { if (window.confirm(`Soft delete ${record.configCode}? This will unlink it from active Pools while preserving historical information.`)) deleteMutation.mutate(record.configCode); }}><Trash2 size={15} /></button>
                  <button className="icon-button view" title="View KPI Configuration detail" onClick={() => navigate(`/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(record.configCode)}&poolId=${poolId}&from=pool-manage`)}><Eye size={15} /></button>
                </div></td>
              </tr>
            )) : <tr><td colSpan={11} className="table-message">No KPI Configurations match these filters.</td></tr>}</tbody>
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
                <button className="button danger" disabled={!selected.length || hideMutation.isPending} onClick={() => { if (window.confirm(`Remove ${selected.length} selected KPI Configuration${selected.length === 1 ? "" : "s"} from this Pool view?`)) hideMutation.mutate(selected); }}><Trash2 size={15} /> Remove Selected</button>
                <button className="button pool-link-selected" disabled={!selectedAvailable.length || addMutation.isPending} onClick={() => addMutation.mutate(selectedAvailable)}><Link2 size={15} /> Link Selected</button>
                <button className="button pool-unlink-selected" disabled={!selectedIncluded.length || removeMutation.isPending} onClick={() => removeMutation.mutate(selectedIncluded)}><Unlink size={15} /> Unlink Selected</button>
              </div>
            </footer>
          </div>
        </div>
      </section>
      </div>}

      {showImporter && <div className="kpi-modal-backdrop" role="presentation"><section className="import-kpi-modal" role="dialog" aria-modal="true" aria-labelledby="bring-kpi-title">
        <div className="import-modal-heading"><span><PackagePlus size={21} /></span><div><h2 id="bring-kpi-title">Bring KPI Configurations</h2><p>Select one or more configured KPIs to add them to the Manage KPIs table.</p></div><button onClick={() => { setShowImporter(false); setImportSearch(""); setShowRecentKpis(false); setImportSelection([]); setImportStatusFilter("ACTIVE"); setImportCategoryFilter("ALL"); setImportDataSourceFilter("ALL"); }} aria-label="Close"><X size={18} /></button></div>
        <label className="pool-search import-search"><Search size={16} /><input value={importSearch} onChange={(event) => setImportSearch(event.target.value)} placeholder="Search KPI code, name or category..." /></label>
        <label className="recent-kpis-toggle"><input type="checkbox" checked={showRecentKpis} onChange={(event) => setShowRecentKpis(event.target.checked)} /><span><Check size={13} /></span><div><strong>Show latest KPI Configurations</strong><small>Display the most recently available KPIs without typing a search.</small></div></label>
        <div className="import-result-filters">
          <label><span className="import-filter-title">State <span className="import-filter-help" tabIndex={0} aria-label="KPI state filter help"><CircleHelp size={15} /><span role="tooltip"><span><strong>All Active KPIs Available</strong>Shows active configurations available to recover because they are not currently in the Manage KPIs table.</span><span><strong>Inactive KPIs Available</strong>Shows inactive configurations not currently in the Manage KPIs table. They cannot be linked until reactivated.</span><span><strong>All KPIs Available</strong>Shows every active and inactive configuration that has not yet been brought into the Manage KPIs table.</span></span></span></span><select value={importStatusFilter} onChange={(event) => setImportStatusFilter(event.target.value as "ACTIVE" | "INACTIVE" | "ALL")}><option value="ACTIVE">All Active KPIs Available</option><option value="INACTIVE">Inactive KPIs Available</option><option value="ALL">All KPIs Available</option></select></label>
          <label><span>Category</span><select value={importCategoryFilter} onChange={(event) => setImportCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{importCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label><span>Data Source</span><select value={importDataSourceFilter} onChange={(event) => setImportDataSourceFilter(event.target.value)}><option value="ALL">All data sources</option>{importDataSources.map((dataSource) => <option key={dataSource} value={dataSource}>{dataSource}</option>)}</select></label>
        </div>
        <div className="import-options" key={`${normalizedImportSearch}-${showRecentKpis}-${importStatusFilter}-${importCategoryFilter}-${importDataSourceFilter}`}>{!normalizedImportSearch && !showRecentKpis ? <p>Type a KPI code, name or category, or show the latest available configurations.</p> : importableQuery.isLoading ? <p>Searching KPI Configurations...</p> : importable.length ? importable.map((kpi) => <label key={kpi.configCode} className={importSelection.includes(kpi.configCode) ? "selected" : ""}><input type="checkbox" checked={importSelection.includes(kpi.configCode)} onChange={() => setImportSelection((current) => current.includes(kpi.configCode) ? current.filter((code) => code !== kpi.configCode) : [...current, kpi.configCode])} /><span className="import-radio">{importSelection.includes(kpi.configCode) && <Check size={13} />}</span><span><strong>{kpi.configCode} · {kpi.kpiCode}</strong><small>{kpi.name} · {kpi.category} · {kpi.dataSource} · {kpi.status === "ACTIVE" ? "Active" : "Inactive"}</small></span></label>) : <p>No new KPI Configurations match this search and filters.</p>}</div>
        <div className="kpi-modal-actions"><span className="import-selection-count"><strong>{importSelection.length}</strong> selected</span><button className="button secondary" onClick={() => { setShowImporter(false); setImportSearch(""); setShowRecentKpis(false); setImportSelection([]); setImportStatusFilter("ACTIVE"); setImportCategoryFilter("ALL"); setImportDataSourceFilter("ALL"); }}>Cancel</button><button className="button primary" disabled={!importSelection.length || importMutation.isPending} onClick={() => importMutation.mutate(importSelection)}>{importMutation.isPending ? "Bringing KPIs..." : `Bring ${importSelection.length || ""} KPI${importSelection.length === 1 ? "" : "s"} to Table`}</button></div>
      </section></div>}
    </main>
  );
}

type ManageSortKey = keyof Pick<ManageablePoolKpi, "availability" | "configCode" | "kpiCode" | "name" | "category" | "goal" | "measurementUnit" | "dataSource" | "status">;

function AvailabilityCard({ type, count, active, onClick }: { type: PoolKpiAvailability; count: number; active: boolean; onClick: () => void }) {
  return <button className={`availability-card ${type.toLowerCase()} ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}><span className="availability-card-icon">{type === "AVAILABLE" ? <Plus size={17} /> : type === "IN_POOL" ? <Check size={17} /> : <Minus size={17} />}</span><span><small>{availabilityCopy[type]}</small><strong>{count}</strong></span></button>;
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatMeasurementUnit(unit: string) {
  const labels: Record<string, string> = {
    "%": "% Percentage",
    Count: "cant Quantity",
    "$": "$ Dollar",
    "$/km": "$/km Dollars per kilometer",
    Hours: "h Hours",
    Days: "d Days",
    "km/L": "km/L Kilometers per liter",
  };
  return labels[unit] ?? unit;
}

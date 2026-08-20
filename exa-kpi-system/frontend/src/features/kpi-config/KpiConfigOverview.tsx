import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, CirclePause, Eye, Pencil, Plus, Search, Send, Trash2, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfigMultiSelect } from "./ConfigMultiSelect";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { kpiConfigService } from "./kpi-config.service";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import type { KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { SendToPoolModal } from "./SendToPoolModal";
import "./kpi-config.css";
import { ActionToast } from "../../components/ActionToast";
import { OverviewDeleteConfirmation } from "../../components/OverviewDeleteConfirmation";
import "./kpi-config-overview.css";

export function KpiConfigOverview() {
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [actionToast, setActionToast] = useState<{ message: string; tone: "success" | "info" | "warning"; duration?: number } | null>(() => params.get("created") ? { message: "KPI Configuration created successfully. It is now ready to be added to a KPI Pool.", tone: "success" } : null);
  const [search, setSearch] = useState("");
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedConfigIds, setSelectedConfigIds] = useState<number[]>([]);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<KpiConfigRecord | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: ConfigSortKey; direction: SortDirection }>({
    key: "code",
    direction: "asc",
  });
  const configsQuery = useQuery({ queryKey: ["kpi-configurations"], queryFn: kpiConfigService.list });
  const poolsQuery = useQuery({ queryKey: ["kpi-pools"], queryFn: kpiPoolService.list });
  const usageIds = (configsQuery.data ?? []).filter((configuration) => configuration.id > 0 && configuration.status !== "INCOMPLETE").map((configuration) => String(configuration.id));
  const usageQuery = useQuery({ queryKey: ["kpi-pool-configuration-usage", usageIds.join(",")], queryFn: () => kpiPoolService.getConfigurationUsage(usageIds), enabled: usageIds.length > 0 });
  const deleteMutation = useMutation({
    mutationFn: kpiConfigService.softDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-configurations"] });
      setConfigToDelete(null);
      setActionToast({ message: "KPI Configuration was removed from the active overview. Its historical data was preserved.", tone: "info" });
    },
  });
  const configurations = useMemo(() => (configsQuery.data ?? []).map((configuration) => {
    const usage = (usageQuery.data ?? []).find((value) => value.configurationId === String(configuration.id));
    return { ...configuration, usedIn: usage?.usedIn ?? 0, poolNames: usage?.pools.map((pool) => pool.name) ?? [] };
  }), [configsQuery.data, usageQuery.data]);
  const kpiOptions = useMemo(() => [...new Map(configurations.map((config) => [String(config.definitionId), { value: String(config.definitionId), label: config.definitionCode, description: config.definitionName }])).values()], [configurations]);
  const unitOptions = useMemo(() => [...new Set(configurations.map((config) => config.measurementUnit).filter(Boolean))].sort().map((unit) => ({ value: unit, label: unit })), [configurations]);
  const dataSourceOptions = useMemo(() => [...new Set(configurations.map((config) => config.dataSource).filter(Boolean))].sort().map((dataSource) => ({ value: dataSource, label: dataSource })), [configurations]);
  const statusOptions = useMemo(() => ([
    { value: "CONFIGURED", label: "Configured" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "INCOMPLETE", label: "Incomplete" },
  ]), []);
  const statusCounts = useMemo(() => configurations.reduce((counts, configuration) => {
    counts[configuration.status] += 1;
    return counts;
  }, { CONFIGURED: 0, INACTIVE: 0, INCOMPLETE: 0 }), [configurations]);
  const filtered = useMemo(() => configurations.filter((config) => {
    const term = normalizeConfigSearch(search);
    return (!term || configurationSearchText(config).includes(term)) &&
      (!selectedKpis.length || selectedKpis.includes(String(config.definitionId))) &&
      (!selectedUnits.length || selectedUnits.includes(config.measurementUnit)) &&
      (!selectedDataSources.length || selectedDataSources.includes(config.dataSource)) &&
      (!selectedStatuses.length || selectedStatuses.includes(config.status));
  }).sort((left, right) => statusRank(left.status) - statusRank(right.status) || compareSortValues(configSortValue(left, sort.key), configSortValue(right, sort.key), sort.direction)), [configurations, search, selectedDataSources, selectedKpis, selectedStatuses, selectedUnits, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);
  const selectableOnPage = paginated.filter((config) => config.status === "CONFIGURED");
  const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((config) => selectedConfigIds.includes(config.id));
  const selectedConfigurations = configurations.filter((config) => selectedConfigIds.includes(config.id) && config.status === "CONFIGURED");
  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);
  useEffect(() => { setPage(1); }, [search, selectedKpis, selectedUnits, selectedDataSources, selectedStatuses]);

  const sortBy = (key: ConfigSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const toggleConfiguration = (id: number) => {
    setSelectedConfigIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePage = () => {
    const pageIds = selectableOnPage.map((config) => config.id);
    setSelectedConfigIds((current) => allPageSelected
      ? current.filter((id) => !pageIds.includes(id))
      : [...new Set([...current, ...pageIds])]);
  };

  const openSendToPool = () => {
    const duplicatedDefinitions = findDuplicatedDefinitions(selectedConfigurations);
    if (duplicatedDefinitions.length) {
      const labels = duplicatedDefinitions.map((configuration) => configuration.definitionCode).join(", ");
      setActionToast({
        tone: "warning",
        duration: 3500,
        message: `Cannot send these configurations together. Repeated KPI Definitions: ${labels}. A Pool may contain only one configuration per KPI Definition to preserve goal traceability.`,
      });
      return;
    }
    setSendModalOpen(true);
  };

  return (
    <main className="kpi-config-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/kpi-management">KPI Management</Link><span>/</span><Link to="/app/kpi-management/config/overview" aria-current="page">KPI Config Overview</Link></nav>
      <header className="config-page-header">
        <div><h1>KPI Config Overview</h1><p>Manage measurable variants created from reusable KPI Definitions.</p></div>
        <button className="button primary" onClick={() => navigate("/app/kpi-management/config/set")}><Plus size={15} /> New KPI Config</button>
      </header>
      {actionToast && <ActionToast message={actionToast.message} tone={actionToast.tone} duration={actionToast.duration} onClose={() => setActionToast(null)} />}
      <section className="config-overview-toolbar">
        <label className="config-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search any KPI Configuration field..." /></label>
        <ConfigMultiSelect label="KPI Definition" options={kpiOptions} selected={selectedKpis} onChange={setSelectedKpis} searchable />
        <ConfigMultiSelect label="Measurement Unit" options={unitOptions} selected={selectedUnits} onChange={setSelectedUnits} />
        <ConfigMultiSelect label="Data Source" options={dataSourceOptions} selected={selectedDataSources} onChange={setSelectedDataSources} />
        <ConfigMultiSelect label="All statuses" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />
      </section>
      <section className="config-status-cards" aria-label="KPI Configuration status summary">
        <button type="button" className={`configured ${selectedStatuses.length === 1 && selectedStatuses[0] === "CONFIGURED" ? "active" : ""}`} onClick={() => { setSelectedStatuses((current) => current.length === 1 && current[0] === "CONFIGURED" ? [] : ["CONFIGURED"]); setPage(1); }} aria-pressed={selectedStatuses.length === 1 && selectedStatuses[0] === "CONFIGURED"}>
          <span><CheckCircle2 size={21} /></span><span><small>Configured</small><strong>{statusCounts.CONFIGURED}</strong><em>Ready to use in KPI Pools</em></span>
        </button>
        <button type="button" className={`inactive ${selectedStatuses.length === 1 && selectedStatuses[0] === "INACTIVE" ? "active" : ""}`} onClick={() => { setSelectedStatuses((current) => current.length === 1 && current[0] === "INACTIVE" ? [] : ["INACTIVE"]); setPage(1); }} aria-pressed={selectedStatuses.length === 1 && selectedStatuses[0] === "INACTIVE"}>
          <span><CirclePause size={21} /></span><span><small>Inactive</small><strong>{statusCounts.INACTIVE}</strong><em>Unavailable for assignments</em></span>
        </button>
        <button type="button" className={`incomplete ${selectedStatuses.length === 1 && selectedStatuses[0] === "INCOMPLETE" ? "active" : ""}`} onClick={() => { setSelectedStatuses((current) => current.length === 1 && current[0] === "INCOMPLETE" ? [] : ["INCOMPLETE"]); setPage(1); }} aria-pressed={selectedStatuses.length === 1 && selectedStatuses[0] === "INCOMPLETE"}>
          <span><AlertCircle size={21} /></span><span><small>Incomplete</small><strong>{statusCounts.INCOMPLETE}</strong><em>Awaiting KPI configuration</em></span>
        </button>
      </section>
      {selectedConfigurations.length > 0 && <section className="config-bulk-bar" aria-live="polite">
        <div className="config-bulk-count"><span><Check size={15} /></span><strong>{selectedConfigurations.length}</strong> {selectedConfigurations.length === 1 ? "KPI Configuration selected" : "KPI Configurations selected"}</div>
        <div>
          <button type="button" className="config-bulk-clear" onClick={() => setSelectedConfigIds([])}><X size={15} /> Clear selection</button>
          <button type="button" className="button config-send-pool-button" onClick={openSendToPool}><Send size={15} /> Send KPIs to a Pool</button>
        </div>
      </section>}
      <div className="kpi-table-wrap config-table-wrap stable-table-shell">
        <table className={`kpi-table config-table ${selectedConfigurations.length ? "bulk-selection-mode" : ""}`}>
          <thead><tr>
            <th className="config-selection-column"><button type="button" className={`config-row-checkbox ${allPageSelected ? "checked" : ""}`} onClick={togglePage} aria-label={allPageSelected ? "Deselect KPI Configurations on this page" : "Select KPI Configurations on this page"}>{allPageSelected && <Check size={13} />}</button></th>
            <SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>Config Code</SortableTableHeader>
            <SortableTableHeader active={sort.key === "definition"} direction={sort.direction} onSort={() => sortBy("definition")}>KPI Definition</SortableTableHeader>
            <SortableTableHeader active={sort.key === "goal"} direction={sort.direction} onSort={() => sortBy("goal")}>Goal</SortableTableHeader>
            <SortableTableHeader active={sort.key === "unit"} direction={sort.direction} onSort={() => sortBy("unit")}>Unit</SortableTableHeader>
            <SortableTableHeader active={sort.key === "dataSource"} direction={sort.direction} onSort={() => sortBy("dataSource")}>Data Source</SortableTableHeader>
            <SortableTableHeader active={sort.key === "trafficLight"} direction={sort.direction} onSort={() => sortBy("trafficLight")}>Traffic Light</SortableTableHeader>
            <SortableTableHeader active={sort.key === "usedIn"} direction={sort.direction} onSort={() => sortBy("usedIn")}>Used In</SortableTableHeader>
            <SortableTableHeader active={sort.key === "status"} direction={sort.direction} onSort={() => sortBy("status")}>Status</SortableTableHeader>
            <th>Actions</th>
          </tr></thead>
          <tbody>{paginated.length ? paginated.map((config) => (
            <tr key={config.id} className={`${selectedConfigIds.includes(config.id) ? "config-row-selected" : ""} ${config.status === "CONFIGURED" ? "config-row-selectable" : ""}`} onClick={() => { if (config.status === "CONFIGURED") toggleConfiguration(config.id); }}>
              <td className="config-selection-column"><button type="button" className={`config-row-checkbox ${selectedConfigIds.includes(config.id) ? "checked" : ""}`} disabled={config.status !== "CONFIGURED"} title={config.status === "CONFIGURED" ? "Select KPI Configuration" : "Only configured and active KPIs can be sent to a Pool"} onClick={(event) => { event.stopPropagation(); toggleConfiguration(config.id); }} aria-label={`Select ${config.code}`}>{selectedConfigIds.includes(config.id) && <Check size={13} />}</button></td>
              <td>{config.status === "INCOMPLETE" ? <span className="pending-value">Not assigned</span> : <span className="code-pill">{config.code}</span>}</td>
              <td><strong>{config.definitionCode}</strong><small>{config.definitionName}</small></td>
              <td>{config.status === "INCOMPLETE" ? <span className="pending-value">Pending</span> : config.goal}</td>
              <td>{config.measurementUnit || <span className="pending-value">Pending</span>}</td>
              <td>{config.dataSource || <span className="pending-value">Pending</span>}</td>
              <td>{config.status === "INCOMPLETE" ? <span className="pending-value">Not configured</span> : <TrafficDots ranges={config.ranges} />}</td>
              <td>{config.usedIn} {config.usedIn === 1 ? "Pool" : "Pools"}</td>
              <td><span className="config-status-cell"><span className={`config-status ${config.status.toLowerCase()}`}>{formatStatus(config.status)}</span>{config.status === "INCOMPLETE" && <span className="incomplete-help" tabIndex={0} aria-label="Why this KPI is incomplete"><CircleHelp size={15} /><span role="tooltip">This active KPI Definition does not have a KPI Configuration yet. Select Configure KPI to define its goal, unit, data source and traffic-light ranges.</span></span>}</span></td>
              <td><div className="table-actions">
                <button className="icon-button edit" title={config.status === "INCOMPLETE" ? "Configure KPI" : "Edit KPI"} onClick={(event) => {
                  event.stopPropagation();
                  navigate(config.status === "INCOMPLETE"
                    ? `/app/kpi-management/config/set?kpiDefinitionId=${config.definitionId}&from=config-overview`
                    : `/app/kpi-management/config/set?kpiConfigId=${config.id}`);
                }}><Pencil size={14} /></button>
                {config.status !== "INCOMPLETE" && <><button className="icon-button view" title="View details" onClick={(event) => { event.stopPropagation(); navigate(`/app/kpi-management/config/detail-record?kpiConfigId=${config.id}`); }}><Eye size={14} /></button><button className="icon-button delete" title="Delete" aria-label={`Delete ${config.code}`} disabled={deleteMutation.isPending} onClick={(event) => { event.stopPropagation(); setConfigToDelete(config); }}><Trash2 size={14} /></button></>}
              </div></td>
            </tr>
          )) : <tr><td colSpan={10} className="table-message">No KPI Configurations found.</td></tr>}</tbody>
        </table>
        <footer className="config-table-footer">
          <span>
            Showing <strong>{filtered.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
          </span>
          <RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="KPI Config pagination" className="config-pagination" />
        </footer>
      </div>
      {sendModalOpen && <SendToPoolModal configurations={selectedConfigurations} pools={poolsQuery.data ?? []} onClose={() => setSendModalOpen(false)} onAssigned={() => setSelectedConfigIds([])} />}
      {configToDelete && <OverviewDeleteConfirmation title="Remove KPI Configuration?" message={`${configToDelete.code} will disappear from the active Overview. Its historical data will remain preserved.`} pending={deleteMutation.isPending} onAccept={() => deleteMutation.mutate(configToDelete.id)} onCancel={() => setConfigToDelete(null)} />}
    </main>
  );
}

function findDuplicatedDefinitions(configurations: KpiConfigRecord[]) {
  const firstByDefinition = new Map<string, KpiConfigRecord>();
  const duplicated = new Map<string, KpiConfigRecord>();
  for (const configuration of configurations) {
    const definitionId = String(configuration.definitionId);
    if (firstByDefinition.has(definitionId)) duplicated.set(definitionId, configuration);
    else firstByDefinition.set(definitionId, configuration);
  }
  return [...duplicated.values()];
}

type ConfigSortKey = "code" | "definition" | "unit" | "goal" | "dataSource" | "trafficLight" | "usedIn" | "status";

function statusRank(status: KpiConfigRecord["status"]) {
  return { CONFIGURED: 0, INACTIVE: 1, INCOMPLETE: 2 }[status];
}

function configSortValue(config: KpiConfigRecord, key: ConfigSortKey) {
  switch (key) {
    case "definition": return `${config.definitionCode} ${config.definitionName}`;
    case "unit": return config.measurementUnit;
    case "trafficLight": return config.ranges.redFrom;
    default: return config[key];
  }
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function normalizeConfigSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[–—]/g, "-").replace(/_/g, " ").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

function configurationSearchText(config: KpiConfigRecord) {
  const ranges = [
    ["red", config.ranges.redFrom, config.ranges.redTo],
    ["yellow", config.ranges.yellowFrom, config.ranges.yellowTo],
    ["green", config.ranges.greenFrom, config.ranges.greenTo],
  ].flatMap(([color, from, to]) => [`${color} ${from}-${to}`, `${color} ${from} ${to}`, `${color} ${from} to ${to}`, `${from}-${to}`]);
  const pools = [`${config.usedIn} pool`, `${config.usedIn} pools`, `${config.usedIn} p`];
  return normalizeConfigSearch([
    config.code, config.definitionCode, config.definitionName, config.goal, `goal ${config.goal}`,
    config.measurementUnit, config.dataSource, config.evaluationType, ...ranges, ...pools,
    config.status, formatStatus(config.status),
  ].join(" "));
}

function TrafficDots({ ranges }: { ranges: TrafficLightRanges }) {
  const segments = [
    { color: "red", from: ranges.redFrom, to: ranges.redTo },
    { color: "yellow", from: ranges.yellowFrom, to: ranges.yellowTo },
    { color: "green", from: ranges.greenFrom, to: ranges.greenTo },
  ].sort((left, right) => left.from - right.from);
  return (
    <div className="overview-traffic">
      {segments.map((segment) => (
        <span className="traffic-point" key={segment.color} title={`${segment.color}: ${segment.from}-${segment.to}`}>
          <i className={segment.color} />
          <small>{segment.from}-{segment.to}</small>
        </span>
      ))}
    </div>
  );
}

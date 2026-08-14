import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarClock, Check, Database, Layers3, LoaderCircle, Search, Settings2, UserRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiConfigService } from "./kpi-config.service";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import "./kpi-config.css";
import "./kpi-config-detail.css";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function KpiConfigDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedId = Number(params.get("kpiConfigId"));
  const requestedCode = params.get("kpiConfigCode");
  const requestedPoolId = Number(params.get("poolId")) || 1;
  const openedFromPoolDetail = params.get("from") === "pool-detail";
  const openedFromPool = Boolean(requestedCode);
  const configId = requestedId;
  const detailQuery = useQuery({
    queryKey: ["kpi-config-detail", requestedCode ?? configId],
    queryFn: () => openedFromPool
      ? kpiPoolService.getConfigurationDetailByCode(requestedCode as string)
      : kpiConfigService.getDetail(configId as number),
    enabled: openedFromPool || (Number.isFinite(configId) && configId > 0),
  });

  if (!requestedCode && !(Number.isFinite(requestedId) && requestedId > 0)) {
    return <main className="kpi-config-page config-detail-page config-detail-empty"><div className="detail-empty-state"><h1>No KPI Configuration selected</h1><p>Open a KPI Configuration from the Overview to view its details.</p><button className="button secondary" onClick={() => navigate("/app/kpi-management/config/overview")}>Back to Overview</button></div></main>;
  }

  if (detailQuery.isLoading) {
    return (
      <main className="kpi-config-page config-detail-page config-detail-empty">
        <div className="config-detail-loading" role="status" aria-live="polite">
          <LoaderCircle size={22} />
          <span>Cargando información…</span>
        </div>
      </main>
    );
  }

  const config = detailQuery.data;
  const isUnconfigured = config?.status === "INCOMPLETE";
  const rangeRows = config ? [
    { label: "Green", color: "green", from: config.ranges.greenFrom, to: config.ranges.greenTo, meaning: "Good" },
    { label: "Yellow", color: "yellow", from: config.ranges.yellowFrom, to: config.ranges.yellowTo, meaning: "Warning" },
    { label: "Red", color: "red", from: config.ranges.redFrom, to: config.ranges.redTo, meaning: "Critical" },
  ] : [];

  return (
    <main className="kpi-config-page config-detail-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/kpi-management">KPI Management</Link><span>/</span>
        <Link to="/app/kpi-management/config/overview">KPI Config</Link><span>/</span>
        <Link to={config ? `/app/kpi-management/config/detail-record?kpiConfigId=${config.id}` : "/app/kpi-management/config/overview"} aria-current="page">Configuration Detail</Link>
      </nav>

      {!config ? <LockedConfigDetail /> : <>
      <header className="config-detail-hero">
        <div><span>KPI Configuration Detail</span><h1>{config.code} {config.definitionName}</h1><p>Read-only record of the base definition, measurement rules and usage.</p></div>
        <span className={`config-status ${config.status.toLowerCase()}`}>{formatStatus(config.status)}</span>
      </header>

      <div className="config-detail-main-grid">
        <section className="config-detail-card">
          <Heading icon={<Layers3 size={16} />} title="Base KPI Information" note="Definition identity" />
          <dl className="config-detail-data">
            <div><dt>Base KPI Code</dt><dd>{config.definitionCode}</dd></div>
            <div><dt>Config Code</dt><dd className={isUnconfigured ? "no-data-value" : ""}>{isUnconfigured ? "No Data" : config.code}</dd></div>
            <div className="full"><dt>KPI Name</dt><dd>{config.definitionName}</dd></div>
            <div><dt>Configuration State</dt><dd className={isUnconfigured ? "no-data-value" : ""}>{isUnconfigured ? "No Data" : formatStatus(config.status)}</dd></div>
          </dl>
        </section>
        <aside className="config-detail-card">
          <Heading icon={<CalendarClock size={16} />} title="Audit Information" note="Read-only" />
          <div className="config-audit-grid">
            <Audit icon={<CalendarClock size={14} />} label="Created at" value={formatDate(config.createdAt)} />
            <Audit icon={<UserRound size={14} />} label="Created by" value={config.createdBy} />
            <Audit icon={<CalendarClock size={14} />} label="Updated at" value={formatDate(config.updatedAt)} />
            <Audit icon={<UserRound size={14} />} label="Updated by" value={config.updatedBy} />
          </div>
        </aside>
      </div>

      <section className="measurement-detail-strip">
        <Heading icon={<Settings2 size={16} />} title="Measurement Configuration" />
        <div className="measurement-values">
          <div><span>Measurement Unit</span><strong className={isUnconfigured ? "no-data-value" : ""}>{isUnconfigured ? "No Data" : config.measurementUnit}</strong></div>
          <div><span>Data Source</span><strong className={isUnconfigured ? "no-data-value" : ""}>{isUnconfigured ? "No Data" : config.dataSource}</strong></div>
          <div><span>Goal</span><strong className={isUnconfigured ? "no-data-value" : ""}>{isUnconfigured ? "No Data" : config.goal}</strong></div>
        </div>
      </section>

      <div className="config-detail-bottom-grid">
        <section className="config-detail-card">
          <Heading icon={<Settings2 size={16} />} title="Traffic Light Ranges" note="Score scale 0–100" />
          <table className="range-detail-table">
            <thead><tr><th>Color</th><th>From</th><th>To</th><th>Meaning</th></tr></thead>
            <tbody>{isUnconfigured
              ? <tr><td colSpan={4} className="range-no-data">No Data</td></tr>
              : rangeRows.map((range) => <tr key={range.color}><td><span className={`range-detail-color ${range.color}`}><i />{range.label}</span></td><td>{range.from}%</td><td>{range.to}%</td><td>{range.meaning}</td></tr>)}</tbody>
          </table>
          <div className="detail-traffic-overview" aria-label="Traffic light range overview">
            {isUnconfigured ? (
              <div className="detail-traffic-bar no-data-bar"><span>No Data</span></div>
            ) : <>
              <div className="detail-traffic-bar">
                {[...rangeRows].sort((left, right) => left.from - right.from).map((range) => (
                  <span
                    className={range.color}
                    key={range.color}
                    style={{ width: `${Math.max(1, range.to - range.from + 1)}%` }}
                  />
                ))}
              </div>
              <div className="detail-traffic-labels">
                {[...rangeRows].sort((left, right) => left.from - right.from).map((range) => (
                  <span
                    key={range.color}
                    style={{ width: `${Math.max(1, range.to - range.from + 1)}%` }}
                  >
                    {range.from}-{range.to}%
                  </span>
                ))}
              </div>
            </>}
          </div>
        </section>
        <section className="config-detail-card usage-detail-card">
          <Heading icon={<Database size={16} />} title="Usage Information" note={config.usedIn ? `${config.usedIn} ${config.usedIn === 1 ? "Pool" : "Pools"}` : "No Data"} />
          <div className="usage-total"><span>Used in</span><strong>{config.usedIn} {config.usedIn === 1 ? "Pool" : "Pools"}</strong></div>
          <div className="pool-usage-list">
            {config.poolNames.length ? config.poolNames.map((pool) => <div key={pool}><span>{pool}</span><strong><i />Active</strong></div>) : <p>Not currently assigned to any KPI Pool.</p>}
          </div>
        </section>
      </div>

      <footer className="config-detail-actions"><button className="button secondary" onClick={() => navigate(openedFromPool ? (openedFromPoolDetail ? `/app/pool-kpis/detail/${requestedPoolId}` : `/app/pool-kpis/manage-kpis?poolId=${requestedPoolId}`) : "/app/kpi-management/config/overview")}><ArrowLeft size={15} /> {openedFromPool ? (openedFromPoolDetail ? "Back to KPI Pool Detail" : "Back to Manage KPIs") : "Back to KPI Config Overview"}</button></footer>
      </>}
    </main>
  );
}

function ConfigDetailSearch({ configurations, selectedId, onSelect }: {
  configurations: Awaited<ReturnType<typeof kpiConfigService.list>>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const selected = configurations.find((config) => config.id === selectedId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = selected ? `${selected.code} - ${selected.definitionName}` : "";
  const normalizedSearch = search === selectedLabel ? "" : search.toLowerCase();
  const filtered = configurations.filter((config) =>
    `${config.code} ${config.definitionCode} ${config.definitionName}`.toLowerCase().includes(normalizedSearch),
  );
  useEffect(() => {
    if (selected) setSearch(selectedLabel);
  }, [selected?.id]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <section className="config-detail-search-card">
      <label>KPI Configuration</label>
      <div className="config-detail-search" ref={rootRef}>
        <Search size={17} />
        <input
          value={search}
          placeholder="Search KPI Config code or name..."
          onFocus={() => setOpen(true)}
          onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
        />
        {search && <button type="button" onClick={() => { setSearch(""); setOpen(true); }} aria-label="Clear KPI Configuration search"><X size={15} /></button>}
        {open && (
          <div className="config-detail-search-options">
            <button type="button" className="config-detail-placeholder-option" onClick={() => { onSelect(null); setSearch(""); setOpen(false); }}>
              <strong>Select a KPI Configuration</strong>
              <small>Clear the current selection</small>
              {selectedId === null && <Check className="config-detail-selected-check" size={18} aria-label="Selected" />}
            </button>
            {filtered.length ? filtered.map((config) => (
              <button type="button" key={config.id} className={config.id === selectedId ? "selected" : ""} onClick={() => { onSelect(config.id); setSearch(`${config.code} - ${config.definitionName}`); setOpen(false); }}>
                <strong>{config.code} · {config.definitionCode}</strong>
                <small>{config.definitionName}</small>
                {config.id === selectedId && <Check className="config-detail-selected-check" size={18} aria-label="Selected" />}
              </button>
            )) : <p>No KPI Configurations found.</p>}
          </div>
        )}
      </div>
      <p>Select a KPI Configuration to display its read-only detail record.</p>
    </section>
  );
}

function LockedConfigDetail() {
  return (
    <div className="locked-config-detail" aria-label="No KPI Configuration selected">
      <header className="config-detail-hero locked"><div><span>KPI Configuration Detail</span><h1>No configuration selected</h1><p>Select a KPI Configuration above to unlock its read-only information.</p></div><span className="config-status incomplete">Locked</span></header>
      <div className="config-detail-main-grid">
        <section className="config-detail-card"><Heading icon={<Layers3 size={16} />} title="Base KPI Information" note="Locked" /><div className="locked-field-grid">{["Base KPI Code", "Config Code", "KPI Name", "Configuration State"].map((label) => <label key={label}><span>{label}</span><input disabled value="" /></label>)}</div></section>
        <aside className="config-detail-card"><Heading icon={<CalendarClock size={16} />} title="Audit Information" note="Locked" /><div className="locked-field-grid">{["Created at", "Created by", "Updated at", "Updated by"].map((label) => <label key={label}><span>{label}</span><input disabled value="" /></label>)}</div></aside>
      </div>
      <section className="measurement-detail-strip"><Heading icon={<Settings2 size={16} />} title="Measurement Configuration" note="Locked" /><div className="measurement-values">{["Measurement Unit", "Data Source", "Goal"].map((label) => <div key={label}><span>{label}</span><strong>—</strong></div>)}</div></section>
    </div>
  );
}

function Heading({ icon, title, note }: { icon: ReactNode; title: string; note?: string }) {
  return <div className="detail-card-heading"><div>{icon}<h2>{title}</h2></div>{note && <span>{note}</span>}</div>;
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function Audit({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="config-audit-item"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

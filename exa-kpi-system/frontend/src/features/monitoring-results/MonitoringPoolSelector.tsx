import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, ShieldAlert, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { monitoringPools, type MonitoringPool } from "./monitoring-results.data";

const normalizePoolSearch = (value: string) => value.toLowerCase().replace(/[·._/-]+/g, " ").replace(/\s+/g, " ").trim();
const monitoringPoolStorageKey = "exa:monitoring-results:selected-pool";

export function MonitoringPoolSelector({ pool, locked, onInformationStateChange }: { pool: MonitoringPool; locked: boolean; onInformationStateChange?: (available: boolean) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => {
    if (locked) return `${pool.code} · ${pool.name}`;
    const storedId = Number(window.localStorage.getItem(monitoringPoolStorageKey));
    const storedPool = monitoringPools.find((item) => item.id === storedId);
    return storedPool ? `${storedPool.code} · ${storedPool.name}` : "";
  });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => {
    const term = normalizePoolSearch(query);
    if (!term) return [];
    return monitoringPools.filter((item) => normalizePoolSearch(`${item.code} ${item.name} ${item.companies.join(" ")} ${item.frequency}`).includes(term));
  }, [query]);

  useEffect(() => { if (locked) setQuery(`${pool.code} · ${pool.name}`); }, [locked, pool.code, pool.name]);
  useEffect(() => {
    if (locked || searchParams.get("poolId")) return;
    const storedId = Number(window.localStorage.getItem(monitoringPoolStorageKey));
    if (!monitoringPools.some((item) => item.id === storedId)) return;
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set("poolId", String(storedId)); return next; }, { replace: true });
  }, [locked, searchParams, setSearchParams]);
  useEffect(() => { onInformationStateChange?.(locked || Boolean(query.trim() && suggestions.length)); }, [locked, onInformationStateChange, query, suggestions.length]);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, []);

  const selectPool = (item: MonitoringPool) => {
    window.localStorage.setItem(monitoringPoolStorageKey, String(item.id));
    setQuery(`${item.code} · ${item.name}`);
    setOpen(false);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set("poolId", String(item.id)); next.delete("source"); return next; });
  };
  const clear = () => {
    window.localStorage.removeItem(monitoringPoolStorageKey);
    setQuery("");
    setOpen(false);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("poolId"); next.delete("source"); return next; });
  };

  return <section className={`monitor-pool-selector ${locked ? "locked" : ""}`} aria-label="KPI Pool selector">
    <div><strong>Related KPI Pool</strong><small>{locked ? "Selected from Monitoring Overview" : "Search a Pool to update this view"}</small></div>
    <div className="monitor-pool-autosuggest" ref={rootRef}>
      <label><Search size={18}/><input value={query} readOnly={locked} aria-readonly={locked} aria-autocomplete="list" aria-expanded={open} placeholder="Search Pool code or name..." onFocus={() => { if (!locked) setOpen(true); }} onChange={(event) => { if (!locked) { setQuery(event.target.value); setOpen(true); } }}/><button type="button" tabIndex={locked ? -1 : 0} aria-label={locked ? "Pool selection protected" : "Clear Pool search"} title={locked ? "This Pool was selected from Monitoring Overview" : "Clear search"} onClick={(event) => { event.preventDefault(); if (!locked) clear(); }}>{locked ? <ShieldAlert size={17}/> : query ? <X size={17}/> : null}</button></label>
      {open && !locked && <div className="monitor-pool-suggestions" role="listbox">{!query.trim() ? <p>Type to see Pool suggestions.</p> : suggestions.length ? suggestions.map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPool(item)}><span className="code-pill">{item.code}</span><span><strong>{item.name}</strong><small>{item.companies.join(", ")} · {item.frequency}</small></span>{item.id === pool.id && <Check size={17}/>}</button>) : <p>No matching KPI Pools.</p>}</div>}
    </div>
  </section>;
}

export function MonitoringNoInformation() {
  return <section className="monitor-no-information"><span><Search size={38}/></span><h2>No Information Found</h2><p>Type a valid KPI Pool code or name, then select one of the suggestions to continue.</p></section>;
}

export function MonitoringPoolIdentity({ pool, period, periodOptions, onPeriodChange }: { pool: MonitoringPool; period?: string; periodOptions?: string[]; onPeriodChange?: (value: string) => void }) {
  const periodControl = period && periodOptions && onPeriodChange;
  return <section className="monitor-pool-identity"><div className="monitor-pool-identity-heading"><div><small>{pool.code}</small><h2>{pool.name}</h2><p>KPI Pool used to consolidate and monitor the operational indicators included in this result period.</p></div><span className={`monitor-pool-context-status ${pool.status === "CLOSED" ? "closed" : "active"}`}><i/>{pool.status === "CLOSED" ? "Closed" : "Active"}</span></div><div className="monitor-pool-context-badges"><span><small>Company</small><strong>{pool.companies.join(", ")}</strong></span><span><small>Pool Duration</small><strong>{pool.duration}</strong></span><span><small>Input Frequency</small><strong>{pool.frequency}</strong></span>{periodControl ? <label className="monitor-pool-period-card"><small>Input Period</small><span><select value={period} onChange={(event) => onPeriodChange(event.target.value)}>{periodOptions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></span></label> : <span><small>Current Period</small><strong>{pool.currentPeriod}</strong></span>}</div></section>;
}

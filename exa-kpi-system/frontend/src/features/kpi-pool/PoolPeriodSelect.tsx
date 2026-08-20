import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { PoolInputPeriod } from "./kpi-pool.types";

export function PoolPeriodSelect({ periods, value, onChange }: { periods: PoolInputPeriod[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = periods.find((period) => period.start === value);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <div ref={rootRef} className="pool-period-select">
    <button type="button" className={open ? "open" : ""} onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
      <span>{selected ? formatPeriodOption(selected.start) : "Select period"}</span>
      {selected && <StatusBadge period={selected}/>}<ChevronDown size={17}/>
    </button>
    {open && <div className="pool-period-select-options" role="listbox">{periods.map((period) => <button type="button" role="option" aria-selected={period.start === value} key={period.start} onClick={() => { onChange(period.start); setOpen(false); }}>
      <span>{formatPeriodOption(period.start)}</span>
      <StatusBadge period={period}/>
      {period.start === value && <Check size={15}/>}
    </button>)}</div>}
  </div>;
}

function StatusBadge({ period }: { period: PoolInputPeriod }) {
  const state = period.workflowStatus === "FINALIZED" ? "finalized" : period.workflowStatus === "EDITABLE" ? "editable" : "future";
  return <small className={`pool-period-select-status ${state}`}>{state === "finalized" ? "Finalized" : state === "editable" ? "Editable" : "Future"}</small>;
}

function formatPeriodOption(value: string) {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date);
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "UTC" }).format(date);
  return `${month} • ${year}`;
}

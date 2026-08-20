import { CalendarRange, Check, Circle, Info, Pencil } from "lucide-react";
import type { PoolInputPeriod } from "./kpi-pool.types";
import "./period-workflow.css";

export function PoolPeriodTimeline({ periods, selected, frequency, onSelect }: { poolId: number; periods: PoolInputPeriod[]; selected: string; frequency: string; onSelect: (start: string) => void }) {
  if (!periods.length) return null;
  return <section className="compact-period-timeline" aria-label="Pool validity timeline">
    <div className="compact-period-timeline-heading"><CalendarRange size={21}/><div><span>Pool Validity</span><strong>{formatRange(periods[0].start, periods[periods.length - 1].end)}</strong><small>{periods.length} Input {periods.length === 1 ? "Period" : "Periods"} · {frequency}</small></div><span className="pool-validity-help" tabIndex={0} aria-label="About Pool validity"><Info size={16}/><span role="tooltip">Defines the date range in which this KPI Pool is valid. Input Periods are generated within this range according to the Pool frequency. Finalized historical compositions remain unchanged.</span></span></div>
    <div className="compact-period-track">{periods.map((period) => {
      const selectedPeriod = period.start === selected;
      const state = period.workflowStatus === "FINALIZED" ? "finalized" : period.workflowStatus === "EDITABLE" ? "preparing" : "future";
      const tooltip = state === "finalized" ? "Composition finalized and available downstream" : state === "preparing" ? "Composition is available for planning" : "Composition is not available yet";
      return <button type="button" key={period.start} className={`compact-period-node ${state} ${selectedPeriod ? "selected" : ""}`} onClick={() => onSelect(period.start)} aria-pressed={selectedPeriod} aria-label={`${formatAccessiblePeriod(period.start)}. ${tooltip}`} data-tooltip={tooltip} data-position-label={selectedPeriod ? state === "preparing" ? "YOU ARE PREPARING" : "SELECTED" : ""}>
        <span className="compact-period-marker">{state === "finalized" ? <Check size={13}/> : state === "preparing" ? <Pencil size={12}/> : <Circle size={11}/>}</span>
        <strong>{formatShortPeriod(period.start)}</strong><small>{state === "finalized" ? "Finalized" : state === "preparing" ? "Preparing" : "Future"}</small>
      </button>;
    })}</div>
  </section>;
}

function formatShortPeriod(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(value)).toUpperCase();
}

function formatAccessiblePeriod(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatRange(start: string, end: string) {
  const month = (value: string) => new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(value));
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "UTC" }).format(new Date(end));
  return `${month(start)}–${month(end)} ${year}`;
}

import { CalendarDays } from "lucide-react";
import type { MonitoringPool } from "./monitoring-results.data";

export function MonitoringResultContext({
  pool,
  period,
  onPeriodChange,
}: {
  pool: MonitoringPool;
  period: string;
  onPeriodChange: (value: string) => void;
}) {
  return (
    <section className="monitor-pool-hero">
      <div className="pool-context-title">
        <small>{pool.code}</small>
        <h2>{pool.name}</h2>
        <p>
          KPI Pool used to consolidate and monitor the operational indicators
          included in this result period.
        </p>
        <label className="period-selector">
          <span>
            <CalendarDays size={16} />
            View Input Period
          </span>
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
          >
            <option>Jun 2026</option>
            <option>May 2026</option>
            <option>Apr 2026</option>
            <option>Mar 2026</option>
          </select>
        </label>
      </div>
      <div className="monitor-pool-hero-actions">
        <span className="monitor-status">
          <i />
          {pool.status === "CLOSED" ? "Closed" : "Active"}
        </span>
      </div>
    </section>
  );
}

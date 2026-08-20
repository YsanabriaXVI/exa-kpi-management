import type { InputPeriod } from "../domain/input-period.js";
import { formatDateOnly } from "../domain/input-period.js";

export type MonitoringClosureStatus = "NOT_REQUIRED" | "UNKNOWN" | "OPEN" | "PENDING" | "CLOSED" | "CLOSED_WITH_APPROVED_EXCEPTION";

export type PeriodFinalizationDecision = {
  canFinalize: boolean;
  previousPeriodStart: string | null;
  previousMonitoringStatus: MonitoringClosureStatus;
  reasonCode: "PREVIOUS_INPUT_PERIOD_NOT_CLOSED" | "MONITORING_INTEGRATION_PENDING" | null;
};

export interface MonitoringPeriodStatusProvider {
  getStatus(poolId: bigint, period: InputPeriod): Promise<MonitoringClosureStatus>;
}

// Safe foundation until Monitoring exposes an authoritative REST contract or projection.
// It deliberately never assumes that an unknown period is closed.
const unavailableMonitoringProvider: MonitoringPeriodStatusProvider = {
  async getStatus() { return "UNKNOWN"; },
};

export const periodFinalizationGateway = {
  async evaluate(poolId: bigint, periods: InputPeriod[], periodIndex: number, provider: MonitoringPeriodStatusProvider = unavailableMonitoringProvider): Promise<PeriodFinalizationDecision> {
    if (periodIndex === 0) return { canFinalize: true, previousPeriodStart: null, previousMonitoringStatus: "NOT_REQUIRED", reasonCode: null };
    const previous = periods[periodIndex - 1];
    if (!previous) return { canFinalize: false, previousPeriodStart: null, previousMonitoringStatus: "UNKNOWN", reasonCode: "MONITORING_INTEGRATION_PENDING" };
    const status = await provider.getStatus(poolId, previous);
    const canFinalize = status === "CLOSED" || status === "CLOSED_WITH_APPROVED_EXCEPTION";
    return {
      canFinalize,
      previousPeriodStart: formatDateOnly(previous.start),
      previousMonitoringStatus: status,
      reasonCode: canFinalize ? null : status === "UNKNOWN" ? "MONITORING_INTEGRATION_PENDING" : "PREVIOUS_INPUT_PERIOD_NOT_CLOSED",
    };
  },
};

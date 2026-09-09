import { recoverMonitoringClosure } from "../clients/monitoring-closure.client.js";
import type { InputPeriod } from "../domain/input-period.js";
import { formatDateOnly } from "../domain/input-period.js";
import { prisma } from "../config/prisma.js";

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

// Recover a missing projection from Monitoring; never infer closure from calendar dates.
const persistedMonitoringProvider: MonitoringPeriodStatusProvider = {
  async getStatus(poolId, period) {
    const input=await prisma.kpiPoolInputPeriod.findUnique({where:{kpiPoolId_periodStart:{kpiPoolId:poolId,periodStart:period.start}}});
    if(!input)return "UNKNOWN";
    const where={kpiPoolId_poolInputPeriodExternalId:{kpiPoolId:poolId,poolInputPeriodExternalId:input.id}};
    let closure=await prisma.monitoringPeriodClosureReference.findUnique({where});
    if(!closure && await recoverMonitoringClosure(poolId,input)) closure=await prisma.monitoringPeriodClosureReference.findUnique({where});
    return closure ? closure.closureType==="WITH_EXCEPTIONS" ? "CLOSED_WITH_APPROVED_EXCEPTION" : "CLOSED" : "OPEN";
  },
};

export const periodFinalizationGateway = {
  async evaluate(poolId: bigint, periods: InputPeriod[], periodIndex: number, provider: MonitoringPeriodStatusProvider = persistedMonitoringProvider): Promise<PeriodFinalizationDecision> {
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

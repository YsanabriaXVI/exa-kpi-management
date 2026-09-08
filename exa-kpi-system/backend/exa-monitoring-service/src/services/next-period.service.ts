import { prisma } from "../config/prisma.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { monitoringReadService } from "./monitoring-read.service.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";
import { serviceRequest } from "../clients/http.client.js";
import { monitoringPeriodService } from "./monitoring-period.service.js";

export const nextPeriodService = {
  async initialize(id: string, actor: bigint) {
    const target = await this.resolve(id);
    if (!target.inputPeriod?.poolPeriodId) throw new AppError(409, "NEXT_PERIOD_UNAVAILABLE", target.reason ?? "The next Input Period is unavailable");
    if (target.monitoringPeriod) return { created: false, data: target.monitoringPeriod };
    const source = await prisma.monitoringPeriod.findUniqueOrThrow({ where: { id: BigInt(id) } });
    if (!target.inputPeriod.poolCompositionId) {
      await serviceRequest("KPI Pool", env.KPI_POOL_BASE_URL, `/api/v1/kpi-pools/${target.poolId}/input-periods/finalize`, { method: "POST", body: JSON.stringify({ periodStart: target.inputPeriod.start }) });
    }
    await serviceRequest("Scorecards", env.SCORECARDS_BASE_URL, "/api/v1/scorecards/internal/prepare-next-period", { method: "POST", signal: AbortSignal.timeout(120000), body: JSON.stringify({ poolId: target.poolId, sourcePeriodKey: source.periodKey, targetPeriodKey: target.inputPeriod.periodKey }) });
    return monitoringPeriodService.materialize({ poolId: target.poolId, poolInputPeriodId: target.inputPeriod.poolPeriodId }, actor);
  },
  async resolve(id: string) {
    const source = await prisma.monitoringPeriod.findUnique({ where: { id: BigInt(id) }, include: { status: true } });
    if (!source) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    if (source.status.code !== "CLOSED") throw new AppError(409, "NEXT_PERIOD_REQUIRES_CLOSED", "Close the current period before continuing to Next Period");
    const poolId = source.kpiPoolExternalId.toString();
    const periods = await kpiPoolClient.periods(poolId);
    const end = source.periodEnd.toISOString().slice(0, 10);
    const next = periods.filter(period => period.start > end).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!next) return { availability: "END_OF_SCHEDULE", reason: "There are no more Input Periods in this Pool calendar.", inputPeriod: null, monitoringPeriod: null, poolId };
    if (!next.poolPeriodId) return { availability: "NOT_AVAILABLE", reason: "The next Input Period has not been configured in the Pool.", inputPeriod: next, monitoringPeriod: null, poolId };
    return { ...await monitoringReadService.resolve(poolId, next.poolPeriodId), poolId };
  },
};

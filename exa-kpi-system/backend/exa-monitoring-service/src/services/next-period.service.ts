import { prisma } from "../config/prisma.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { monitoringReadService } from "./monitoring-read.service.js";
import { AppError } from "../utils/app-error.js";

export const nextPeriodService = {
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

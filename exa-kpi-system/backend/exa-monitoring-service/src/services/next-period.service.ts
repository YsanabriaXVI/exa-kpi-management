import { prisma } from "../config/prisma.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { scorecardsClient } from "../clients/scorecards.client.js";
import { monitoringReadService } from "./monitoring-read.service.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";
import { serviceRequest } from "../clients/http.client.js";
import { monitoringPeriodService } from "./monitoring-period.service.js";

export const nextPeriodService = {
  async initialize(id: string, actor: bigint) {
    const target = await this.resolve(id);
    if (target.monitoringPeriod) return { created: false, data: target.monitoringPeriod, stage: "MONITORING_MATERIALIZED" };
    if (!target.inputPeriod?.poolPeriodId || target.stage !== "READY_TO_MATERIALIZE")
      throw new AppError(409, "NEXT_PERIOD_REVIEW_REQUIRED", "Finalize the Pool and every Scorecard composition before initializing Monitoring", { stage: target.stage });
    const result = await monitoringPeriodService.materialize({ poolId: target.poolId, poolInputPeriodId: target.inputPeriod.poolPeriodId }, actor);
    return { ...result, stage: "MONITORING_MATERIALIZED" };
  },
  async prepareScorecards(id: string) {
    const target = await this.resolve(id);
    if (!target.inputPeriod?.poolPeriodId || target.inputPeriod.workflowStatus !== "FINALIZED")
      throw new AppError(409, "POOL_COMPOSITION_NOT_FINALIZED", "Review and finalize the Pool composition first");
    if (target.monitoringPeriod) return { ...target, removedKpis: [] };
    const source = await prisma.monitoringPeriod.findUniqueOrThrow({ where: { id: BigInt(id) } });
    const prepared = await serviceRequest<{ removedKpis?: unknown[] }>("Scorecards", env.SCORECARDS_BASE_URL, "/api/v1/scorecards/internal/prepare-next-period", {
      method: "POST", signal: AbortSignal.timeout(120000), body: JSON.stringify({ poolId: target.poolId, sourcePeriodKey: source.periodKey, targetPeriodKey: target.inputPeriod.periodKey }),
    });
    return { ...(await this.resolve(id)), removedKpis: prepared.removedKpis ?? [] };
  },
  async resolve(id: string) {
    const source = await prisma.monitoringPeriod.findUnique({ where: { id: BigInt(id) }, include: { status: true } });
    if (!source) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    if (source.status.code !== "CLOSED") throw new AppError(409, "NEXT_PERIOD_REQUIRES_CLOSED", "Close the current period before continuing to Next Period");
    const poolId = String(source.kpiPoolExternalId);
    const periods = await kpiPoolClient.periods(poolId);
    const next = periods.filter(p => p.start > source.periodEnd.toISOString().slice(0, 10)).sort((a,b) => a.start.localeCompare(b.start))[0];
    if (!next) return { poolId, inputPeriod: null, monitoringPeriod: null, stage: "END_OF_SCHEDULE", reason: "There are no more Input Periods in this Pool calendar.", scorecards: [] };
    if (!next.poolPeriodId || next.workflowStatus !== "FINALIZED") return { poolId, inputPeriod: next, monitoringPeriod: null, stage: "POOL_EDITABLE", reason: "Review inherited membership in Manage KPIs, then finalize the Pool composition.", scorecards: [] };
    const resolved = await monitoringReadService.resolve(poolId, next.poolPeriodId);
    const projection = await scorecardsClient.materialization(poolId, next.poolPeriodId);
    return { ...resolved, poolId, inputPeriod: next, scorecards: projection.scorecards.map(c => ({ id: c.scorecardId, code: c.scorecardCode, name: c.scorecardName, status: c.compositionStatus })), stage: resolved.monitoringPeriod ? "MONITORING_MATERIALIZED" : projection.readiness === "READY" ? "READY_TO_MATERIALIZE" : "SCORECARDS_REVIEW" };
  },
};

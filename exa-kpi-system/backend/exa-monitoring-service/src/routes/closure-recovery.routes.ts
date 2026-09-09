import { Router } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

export const closureRecoveryRouter = Router();
const query = z.object({ poolId: z.string().regex(/^[1-9]\d*$/), poolInputPeriodId: z.string().regex(/^[1-9]\d*$/),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict();
closureRecoveryRouter.get("/", async (request, response, next) => {
  try {
    const q = query.parse(request.query);
    const period = await prisma.monitoringPeriod.findUnique({where:{kpiPoolExternalId_poolInputPeriodExternalId:{kpiPoolExternalId:BigInt(q.poolId),poolInputPeriodExternalId:BigInt(q.poolInputPeriodId)}},include:{status:true}});
    if (!period) { response.json({status:"NOT_MATERIALIZED"}); return; }
    if (period.periodStart.toISOString().slice(0,10) !== q.periodStart || period.periodEnd.toISOString().slice(0,10) !== q.periodEnd)
      throw new AppError(409,"CLOSURE_CONTEXT_MISMATCH","Pool and Monitoring period dates do not match");
    if (period.status.code !== "CLOSED") { response.json({status:"OPEN"}); return; }
    if (!period.closedAt) throw new AppError(409,"CLOSURE_INCOMPLETE","Closed Monitoring period has no closure timestamp");
    // Stable identity for authoritative recovery, including legacy closures without Outbox rows.
    const hash = createHash("sha256").update(`monitoring-closure:${period.id}:${period.version}`).digest("hex");
    const eventId = `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
    response.json({status:"CLOSED",event:{eventId,eventType:"monitoring.period.closed.v1",producer:"exa-monitoring-service",
      occurredAt:period.closedAt.toISOString(),aggregateId:String(period.id),version:period.version,
      data:{monitoringPeriodId:String(period.id),kpiPoolId:q.poolId,poolInputPeriodId:q.poolInputPeriodId,periodKey:period.periodKey,
        closedAt:period.closedAt.toISOString(),closedWithExceptions:period.closedWithExceptions}}});
  } catch(error) { next(error); }
});

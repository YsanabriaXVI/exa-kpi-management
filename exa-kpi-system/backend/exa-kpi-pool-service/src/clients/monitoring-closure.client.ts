import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { processMonitoringClosedEvent } from "../consumers/monitoring-events.consumer.js";

export async function recoverMonitoringClosure(poolId: bigint, input: {id:bigint;periodKey:string;periodStart:Date;periodEnd:Date}) {
  const query=new URLSearchParams({poolId:String(poolId),poolInputPeriodId:String(input.id),periodStart:input.periodStart.toISOString().slice(0,10),periodEnd:input.periodEnd.toISOString().slice(0,10)});
  try {
    const response=await fetch(`${env.MONITORING_BASE_URL}/api/v1/monitoring-periods/internal/closure?${query}`,{signal:AbortSignal.timeout(env.MONITORING_TIMEOUT_MS)});
    if(response.status===409)throw new AppError(409,"CLOSURE_CONTEXT_MISMATCH","Monitoring could not confirm this exact closed period; review the closure context");
    if(!response.ok)throw new Error(`Monitoring returned ${response.status}`);
    const payload=z.object({status:z.enum(["OPEN","NOT_MATERIALIZED","CLOSED"]),event:z.unknown().optional()}).parse(await response.json());
    if(payload.status!=="CLOSED")return false;
    z.object({data:z.object({kpiPoolId:z.literal(String(poolId)),poolInputPeriodId:z.literal(String(input.id)),periodKey:z.literal(input.periodKey)})}).passthrough().parse(payload.event);
    await processMonitoringClosedEvent(payload.event,"monitoring.period.closed.v1.authoritative-recovery");
    return true;
  } catch(error) {
    if(error instanceof AppError)throw error;
    throw new AppError(503,"MONITORING_CLOSURE_UNAVAILABLE","Waiting for authoritative confirmation of the previous Monitoring closure",{cause:error instanceof Error?error.message:String(error)});
  }
}

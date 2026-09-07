import { prisma } from "../config/prisma.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { scorecardsClient } from "../clients/scorecards.client.js";
import { monitoringPeriodService } from "./monitoring-period.service.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// Reconcile every FINALIZED calendar period, including predecessors and events
// missed while Monitoring was offline. Existing snapshots are never replaced.
export async function reconcileMonitoringPeriods() {
  const outcomes: Array<{ poolId:string; periodKey?:string; status:string; reason?:string }> = [];
  for (const pool of await kpiPoolClient.list()) {
    try {
      const periods = (await kpiPoolClient.periods(pool.id)).filter(p => p.workflowStatus === "FINALIZED" && p.poolPeriodId).sort((a,b)=>a.start.localeCompare(b.start));
      for (const period of periods) {
        const inputId=period.poolPeriodId!;
        try {
          const existing=await prisma.monitoringPeriod.findUnique({where:{kpiPoolExternalId_poolInputPeriodExternalId:{kpiPoolExternalId:BigInt(pool.id),poolInputPeriodExternalId:BigInt(inputId)}},select:{id:true}});
          if(existing){outcomes.push({poolId:pool.id,periodKey:period.periodKey,status:"EXISTING"});continue;}
          const projection=await scorecardsClient.materialization(pool.id,inputId);
          if(projection.readiness!=="READY"){outcomes.push({poolId:pool.id,periodKey:period.periodKey,status:"WAITING",reason:projection.reason??"SCORECARDS_NOT_READY"});continue;}
          const created=await monitoringPeriodService.materialize({poolId:pool.id,poolInputPeriodId:inputId},env.TEMPORARY_ACTOR_USER_ID);
          outcomes.push({poolId:pool.id,periodKey:period.periodKey,status:created.created?"CREATED":"EXISTING"});
        } catch(error) {outcomes.push({poolId:pool.id,periodKey:period.periodKey,status:"BLOCKED",reason:(error as {code?:string}).code??"RECONCILIATION_FAILED"});}
      }
    } catch(error) {outcomes.push({poolId:pool.id,status:"UNAVAILABLE",reason:(error as {code?:string}).code??"POOL_UNAVAILABLE"});}
  }
  return outcomes;
}
let timer: ReturnType<typeof setTimeout> | undefined;
let stopped=true;
let running:Promise<void>|undefined;
export const monitoringReconciliation = {
  start(){if(!stopped||!env.MONITORING_RECONCILIATION_ENABLED)return;stopped=false;void this.tick();},
  async tick(){
    if(stopped||running)return;
    running=(async()=>{try{const outcomes=await reconcileMonitoringPeriods();logger.info({outcomes},"Monitoring calendar reconciliation completed");}catch(error){logger.warn({error},"Monitoring calendar reconciliation deferred");}})();
    await running;running=undefined;
    if(!stopped){timer=setTimeout(()=>void this.tick(),env.MONITORING_RECONCILIATION_INTERVAL_MS);timer.unref();}
  },
  async stop(){stopped=true;if(timer)clearTimeout(timer);await running;},
};

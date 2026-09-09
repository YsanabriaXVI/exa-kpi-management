import { prisma } from "../config/prisma.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { monitoringReadService } from "./monitoring-read.service.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";
import { serviceRequest } from "../clients/http.client.js";
import { monitoringPeriodService } from "./monitoring-period.service.js";

export const nextPeriodService = {
  async initialize(id: string, actor: bigint) {
    let stage = "POOL_COMPOSITION_PENDING";
    for(let attempt=0;attempt<3;attempt++) {
      try {
        // Resolve on every attempt: a previous timed-out request may have committed.
        const target=await this.resolve(id);
        if(!target.inputPeriod?.poolPeriodId)throw new AppError(409,"NEXT_PERIOD_UNAVAILABLE",target.reason??"No next Input Period");
        if(target.monitoringPeriod)return {created:false,data:target.monitoringPeriod,stage:"MONITORING_MATERIALIZED"};
        stage=target.stage;
        const source=await prisma.monitoringPeriod.findUniqueOrThrow({where:{id:BigInt(id)}});
        if(!target.inputPeriod.poolCompositionId)await serviceRequest("KPI Pool",env.KPI_POOL_BASE_URL,
          `/api/v1/kpi-pools/${target.poolId}/input-periods/finalize`,{method:"POST",body:JSON.stringify({periodStart:target.inputPeriod.start})});
        stage="POOL_COMPOSITION_READY";
        if(target.stage!=="SCORECARDS_PREPARED")await serviceRequest("Scorecards",env.SCORECARDS_BASE_URL,"/api/v1/scorecards/internal/prepare-next-period",
          {method:"POST",signal:AbortSignal.timeout(120000),body:JSON.stringify({poolId:target.poolId,sourcePeriodKey:source.periodKey,targetPeriodKey:target.inputPeriod.periodKey})});
        stage="SCORECARDS_PREPARED";
        const result=await monitoringPeriodService.materialize({poolId:target.poolId,poolInputPeriodId:target.inputPeriod.poolPeriodId},actor);
        return {...result,stage:"MONITORING_MATERIALIZED"};
      }catch(error){
        const downstream=error instanceof AppError?(error.details as any)?.downstreamError?.code:undefined;
        const code=downstream??(error as {code?:string}).code;
        if(["PREVIOUS_INPUT_PERIOD_NOT_CLOSED","MONITORING_CLOSURE_UNAVAILABLE","NEXT_PERIOD_REQUIRES_CLOSED"].includes(code??""))stage="WAITING_FOR_PREVIOUS_CLOSE";
        const retryable=error instanceof AppError && error.statusCode>=500 || ["P2002","P2034","POOL_PERIOD_LOCKED","POOL_PERIOD_NOT_EDITABLE","SCORECARD_COMPOSITION_ALREADY_FINALIZED","PREVIOUS_INPUT_PERIOD_NOT_CLOSED"].includes(code??"");
        if(retryable&&attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue;}
        throw new AppError(error instanceof AppError?error.statusCode:503,"NEXT_PERIOD_INITIALIZATION_INCOMPLETE",
          error instanceof Error?error.message:"Next Period initialization interrupted",{stage,retryable,causeCode:code??"UNKNOWN",attempts:attempt+1});
      }
    }
    throw new AppError(503,"NEXT_PERIOD_INITIALIZATION_INCOMPLETE","Retry Initialize Next Period",{stage,retryable:true});
  },
  async resolve(id: string) {
    const source = await prisma.monitoringPeriod.findUnique({ where: { id: BigInt(id) }, include: { status: true } });
    if (!source) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    if (source.status.code !== "CLOSED") throw new AppError(409, "NEXT_PERIOD_REQUIRES_CLOSED", "Close the current period before continuing to Next Period");
    const poolId = source.kpiPoolExternalId.toString();
    const periods = await kpiPoolClient.periods(poolId);
    const end = source.periodEnd.toISOString().slice(0, 10);
    const next = periods.filter(period => period.start > end).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!next) return { availability: "END_OF_SCHEDULE", reason: "There are no more Input Periods in this Pool calendar.", inputPeriod: null, monitoringPeriod: null, poolId, stage: "END_OF_SCHEDULE" };
    if (!next.poolPeriodId) return { availability: "NOT_AVAILABLE", reason: "The next Input Period has not been configured in the Pool.", inputPeriod: next, monitoringPeriod: null, poolId, stage: "POOL_COMPOSITION_PENDING" };
    try {
      const resolved=await monitoringReadService.resolve(poolId,next.poolPeriodId);
      return {...resolved,poolId,stage:resolved.monitoringPeriod?"MONITORING_MATERIALIZED":resolved.availability==="READY_TO_MATERIALIZE"?"SCORECARDS_PREPARED":next.poolCompositionId?"POOL_COMPOSITION_READY":"POOL_COMPOSITION_PENDING"};
    } catch(error) {
      if(!(error instanceof AppError)||error.statusCode<500)throw error;
      return {poolId,inputPeriod:next,monitoringPeriod:null,availability:"NOT_AVAILABLE",stage:next.poolCompositionId?"POOL_COMPOSITION_READY":"POOL_COMPOSITION_PENDING",reason:"A downstream service is unavailable. Retry Initialize Next Period to resume."};
    }
  },
};

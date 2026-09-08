import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { checkResultsBodySchema, type CheckResultsBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import { evaluateCheck } from "./check-results-evaluation.js";
import { CALCULATION_VERSION } from "./scoring-engine.js";
import { resolveEvaluationContexts } from "./historical-baseline.service.js";
import { clearCurrentScoring, isCurrentRun } from "./scoring-validity.js";
import { resultEntryService } from "./result-entry.service.js";

export const checkResultsService = {
  async check(idValue: string, body: CheckResultsBody, actor: bigint) {
    const id=BigInt(idValue);
    const {expectedResultsVersion,expectedBaselineVersion}=checkResultsBodySchema.parse(body);
    try {
      await prisma.$transaction(async tx=>{
        const period=await tx.monitoringPeriod.findUnique({where:{id},include:{status:true}});
        if(!period)throw new AppError(404,"MONITORING_PERIOD_NOT_FOUND","Monitoring Period was not found");
        if(period.status.code!=="DRAFT")throw new AppError(409,"MONITORING_PERIOD_NOT_DRAFT","Check Results requires an editable DRAFT period");
        if(period.resultsVersion!==expectedResultsVersion)throw new AppError(409,"RESULT_VERSION_CONFLICT","Results changed. Reload saved Results and run Check Results again.");
        if(expectedBaselineVersion !== undefined && expectedBaselineVersion !== period.baselineVersion) throw new AppError(409,"BASELINE_VERSION_CONFLICT","Baseline changed. Reload and retry.");
        if(period.selectedEntryMethod!=="MANUAL")throw new AppError(409,"ENTRY_METHOD_CONFLICT","Select Manual before running Check Results");
        // Claim the same period lock as Result writes. This is concurrency control,
        // not the Results provenance and not a workflow transition.
        const claimed=await tx.monitoringPeriod.updateMany({where:{id,version:period.version,resultsVersion:expectedResultsVersion,statusId:period.statusId},data:{version:{increment:1}}});
        if(claimed.count!==1)throw new AppError(409,"RESULT_VERSION_CONFLICT","The period changed. Reload and run Check Results again.");
        const [inputs,cards]=await Promise.all([
          tx.monitoringPeriodInput.findMany({where:{monitoringPeriodId:id},include:{result:true},orderBy:{displayOrder:"asc"}}),
          tx.monitoringPeriodScorecard.findMany({where:{monitoringPeriodId:id},include:{outgoingLinks:true},orderBy:{id:"asc"}}),
        ]);
        const contexts=await resolveEvaluationContexts(tx,period,inputs,actor);
        const evaluated=evaluateCheck(inputs,cards,period.selectedEntryMethod,contexts);
        const aggregate=await tx.monitoringValidationRun.aggregate({where:{monitoringPeriodId:id},_max:{runNo:true}});
        const run=await tx.monitoringValidationRun.create({data:{monitoringPeriodId:id,runNo:(aggregate._max.runNo??0)+1,basedOnResultsVersion:period.resultsVersion,basedOnBaselineVersion:period.baselineVersion??0,status:"RECORDED",calculationVersion:CALCULATION_VERSION,
          summary:evaluated.summary,scoringSnapshot:{basedOnResultsVersion:period.resultsVersion,basedOnBaselineVersion:period.baselineVersion??0,...evaluated},createdByUserId:actor}});
        await clearCurrentScoring(tx,id);
        for(const row of evaluated.evaluations){
          const result=inputs.find(i=>String(i.id)===row.id)?.result;
          // A missing Result is represented in the Check snapshot; never fabricate a Result row.
          if(!result)continue;
          await tx.kpiResult.update({where:{id:result.id},data:{rawAchievementPercent:row.rawAchievementPercent,compliancePercent:row.compliancePercent,goalMet:row.goalMet,trafficLightCode:row.trafficLight,
            weightedScorePoints:row.weightedContribution,calculationStatus:row.status,calculationErrorCode:row.errorCode,calculationVersion:CALCULATION_VERSION,calculatedAt:new Date()}});
        }
        for(const card of evaluated.scorecards)await tx.monitoringPeriodScorecard.update({where:{id:BigInt(card.id)},data:{previewScorePercent:card.scoreStatus==="COMPLETE"?card.score:null,calculationVersion:CALCULATION_VERSION,calculatedAt:new Date()}});
        if(evaluated.findings.length)await tx.monitoringValidationIssue.createMany({data:evaluated.findings.map(f=>({validationRunId:run.id,monitoringPeriodId:id,monitoringPeriodInputId:f.monitoringPeriodInputId?BigInt(f.monitoringPeriodInputId):null,kpiConfigurationExternalId:f.kpiConfigurationId?BigInt(f.kpiConfigurationId):null,
          findingCode:f.code,severity:f.severity,message:f.message,details:f,blocksSubmit:f.blocking,blocksApproval:f.blocking,exceptionAllowed:f.code==="RESULT_MISSING"}))});
        await tx.monitoringPeriod.update({where:{id},data:{currentScoringResultsVersion:period.resultsVersion,currentScoringBaselineVersion:period.baselineVersion??0,validationStatus:evaluated.summary.runStatus,validationSummary:evaluated.summary,validationRunAt:run.createdAt,validationRunByUserId:actor}});
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2002","P2034"].includes(error.code))throw new AppError(409,"RESULT_VERSION_CONFLICT","Results or another Check changed concurrently. Reload and run Check Results again.");
      throw error;
    }
    return resultEntryService.get(idValue);
  },
  async history(idValue:string){
    const period=await prisma.monitoringPeriod.findUnique({where:{id:BigInt(idValue)},include:{validationRuns:{orderBy:{runNo:"desc"},include:{issues:true}}}});
    if(!period)throw new AppError(404,"MONITORING_PERIOD_NOT_FOUND","Monitoring Period was not found");
    return {resultsVersion:period.resultsVersion,baselineVersion:period.baselineVersion,latestCurrentRunId:period.validationRuns.find(r=>isCurrentRun(r,period))?.id.toString()??null,
      runs:period.validationRuns.map(r=>({id:String(r.id),runNo:r.runNo,basedOnResultsVersion:r.basedOnResultsVersion,basedOnBaselineVersion:r.basedOnBaselineVersion,status:isCurrentRun(r,period)?"CURRENT":"STALE",createdAt:r.createdAt.toISOString(),calculationVersion:r.calculationVersion,summary:r.summary,scoringSnapshot:r.scoringSnapshot}))};
  },
};

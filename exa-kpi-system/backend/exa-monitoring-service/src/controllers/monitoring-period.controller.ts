import { checkResultsService } from "../services/check-results.service.js";
import { checkResultsBodySchema } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import type { NextFunction,Request,Response } from "express"; import { attachedScorecardsQuerySchema, closeMonitoringPeriodBodySchema, detailInputsQuerySchema, materializeMonitoringPeriodBodySchema, monitoringListQuerySchema, monitoringPeriodIdParamsSchema, poolIdParamsSchema, returnForCorrectionBodySchema, saveResultEntryBodySchema, scheduleQuerySchema, workflowVersionBodySchema } from "../schemas/monitoring-period.schema.js"; import { monitoringPeriodService } from "../services/monitoring-period.service.js"; import { resultEntryService } from "../services/result-entry.service.js"; import { monitoringWorkflowService } from "../services/monitoring-workflow.service.js"; import { monitoringReadService } from "../services/monitoring-read.service.js"; export async function materializeMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const result=await monitoringPeriodService.materialize(materializeMonitoringPeriodBodySchema.parse(request.body),request.identity.actorUserId);response.status(result.created?201:200).json(result.data);}catch(error){next(error);}}
import { excelImportService } from "../services/excel-import.service.js";

export async function getResultEntry(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = monitoringPeriodIdParamsSchema.parse(request.params);
    response.json(await resultEntryService.get(id));
  } catch (error) { next(error); }
}
export async function listMonitoringPeriods(request: Request, response: Response, next: NextFunction) { try { const result=await monitoringReadService.overview(monitoringListQuerySchema.parse(request.query)); response.json({items:result.data,meta:result.meta,facets:result.facets}); } catch (error) { next(error); } }
export async function resolveMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const body=materializeMonitoringPeriodBodySchema.parse(request.query);response.json(await monitoringReadService.resolve(body.poolId,body.poolInputPeriodId));}catch(error){next(error);}}
export async function getMonitoringDetail(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringReadService.detail(id,detailInputsQuerySchema.parse(request.query)));}catch(error){next(error);}}
export async function getAttachedScorecards(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringReadService.attached(id,attachedScorecardsQuerySchema.parse(request.query)));}catch(error){next(error);}}
export async function getPoolInputSchedule(request:Request,response:Response,next:NextFunction){try{const{poolId}=poolIdParamsSchema.parse(request.params);response.json(await monitoringReadService.schedule(poolId,scheduleQuerySchema.parse(request.query)));}catch(error){next(error);}}

export async function saveResultEntry(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = monitoringPeriodIdParamsSchema.parse(request.params);
    response.json(await resultEntryService.save(id, saveResultEntryBodySchema.parse(request.body), request.identity.actorUserId));
  } catch (error) { next(error); }
}
export async function downloadExcelTemplate(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);const file=await excelImportService.template(id);response.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");response.setHeader("Content-Disposition",`attachment; filename="${file.filename}"`);response.send(file.buffer);}catch(error){next(error);}}
export async function previewExcelImport(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);if(!request.file)throw new Error("Excel file is required");response.json(await excelImportService.preview(id,request.file.buffer));}catch(error){next(error);}}
export async function confirmExcelImport(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);const body=saveResultEntryBodySchema.parse(request.body);response.json(await excelImportService.confirm(id,body.changes,request.identity.actorUserId));}catch(error){next(error);}}
export async function validateMonitoringPeriod(_request:Request,_response:Response,next:NextFunction){next(new AppError(409,"CHECK_RESULTS_ENDPOINT_REQUIRED","Use the Check Results endpoint to evaluate saved Results. Workflow Validate is a separate operation."));}
export async function submitMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringWorkflowService.submit(id,workflowVersionBodySchema.parse(request.body),request.identity.actorUserId));}catch(error){next(error);}}
export async function returnMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringWorkflowService.returnForCorrection(id,returnForCorrectionBodySchema.parse(request.body),request.identity.actorUserId));}catch(error){next(error);}}
export async function approveMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringWorkflowService.approve(id,workflowVersionBodySchema.parse(request.body),request.identity.actorUserId));}catch(error){next(error);}}
export async function closeMonitoringPeriod(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await monitoringWorkflowService.close(id,closeMonitoringPeriodBodySchema.parse(request.body),request.identity.actorUserId));}catch(error){next(error);}}

export async function checkMonitoringResults(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await checkResultsService.check(id,checkResultsBodySchema.parse(request.body),request.identity.actorUserId));}catch(error){next(error);}}
export async function listCheckRuns(request:Request,response:Response,next:NextFunction){try{const{id}=monitoringPeriodIdParamsSchema.parse(request.params);response.json(await checkResultsService.history(id));}catch(error){next(error);}}

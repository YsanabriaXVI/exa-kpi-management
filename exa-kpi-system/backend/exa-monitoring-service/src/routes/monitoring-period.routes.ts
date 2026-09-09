import { checkMonitoringResults, listCheckRuns } from "../controllers/monitoring-period.controller.js";
import { Router } from "express"; import multer from "multer"; import { approveMonitoringPeriod, closeMonitoringPeriod, confirmExcelImport, downloadExcelTemplate, getAttachedScorecards, getMonitoringDetail, getPoolInputSchedule, getResultEntry, listMonitoringPeriods, materializeMonitoringPeriod, previewExcelImport, resolveMonitoringPeriod, returnMonitoringPeriod, saveResultEntry, submitMonitoringPeriod, validateMonitoringPeriod } from "../controllers/monitoring-period.controller.js"; const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}}); export const monitoringPeriodRouter=Router(); monitoringPeriodRouter.get("/",listMonitoringPeriods); monitoringPeriodRouter.get("/resolve",resolveMonitoringPeriod); monitoringPeriodRouter.get("/pools/:poolId/input-schedule",getPoolInputSchedule); monitoringPeriodRouter.post("/materialize",materializeMonitoringPeriod); monitoringPeriodRouter.get("/:id/detail",getMonitoringDetail); monitoringPeriodRouter.get("/:id/attached-scorecards",getAttachedScorecards); monitoringPeriodRouter.get("/:id/result-entry", getResultEntry); monitoringPeriodRouter.post("/:id/result-entry/save-changes", saveResultEntry); monitoringPeriodRouter.get("/:id/result-entry/excel-template",downloadExcelTemplate); monitoringPeriodRouter.post("/:id/result-entry/excel-preview",upload.single("file"),previewExcelImport); monitoringPeriodRouter.post("/:id/result-entry/excel-confirm",confirmExcelImport); monitoringPeriodRouter.post("/:id/validate",validateMonitoringPeriod); monitoringPeriodRouter.post("/:id/submit",submitMonitoringPeriod); monitoringPeriodRouter.post("/:id/return-for-correction",returnMonitoringPeriod); monitoringPeriodRouter.post("/:id/approve",approveMonitoringPeriod); monitoringPeriodRouter.post("/:id/close",closeMonitoringPeriod);

monitoringPeriodRouter.post("/:id/check-results",checkMonitoringResults);
monitoringPeriodRouter.get("/:id/check-results/runs",listCheckRuns);
monitoringPeriodRouter.get("/:id/inputs/:inputId/baseline-candidates",baselineCandidates);
monitoringPeriodRouter.get("/:id/inputs/:inputId/baseline-resolution/history",baselineHistory);
monitoringPeriodRouter.put("/:id/inputs/:inputId/baseline-resolution",selectBaseline);
monitoringPeriodRouter.post("/:id/inputs/:inputId/baseline-resolution/manual",manualBaseline);
import { baselineCandidates,baselineHistory,selectBaseline,manualBaseline } from "../controllers/historical-baseline.controller.js";
import { nextPeriodService } from "../services/next-period.service.js";
import { monitoringPeriodIdParamsSchema } from "../schemas/monitoring-period.schema.js";
monitoringPeriodRouter.get("/:id/next-period", async (request, response, next) => {
  try { const { id } = monitoringPeriodIdParamsSchema.parse(request.params); response.json(await nextPeriodService.resolve(id)); }
  catch (error) { next(error); }
});
monitoringPeriodRouter.post("/:id/next-period", async (request, response, next) => {
  try { const { id } = monitoringPeriodIdParamsSchema.parse(request.params); const result = await nextPeriodService.initialize(id, request.identity.actorUserId); response.status(result.created ? 201 : 200).json({...result.data,initializationStage:result.stage}); }
  catch (error) { next(error); }
});

import { hasCurrentScoring, isCurrentRun } from "./scoring-validity.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { CloseMonitoringPeriodBody, ReturnForCorrectionBody } from "../schemas/monitoring-period.schema.js";
import { exceptionWorkflowBodySchema, closeMonitoringPeriodBodySchema, type ExceptionWorkflowBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import { resultEntryService } from "./result-entry.service.js";
import { writeMonitoringEvent } from "../outbox/outbox.writer.js";

async function periodOrThrow(tx: Prisma.TransactionClient, id: bigint) {
  const period = await tx.monitoringPeriod.findUnique({ where: { id }, include: { status: true } });
  if (!period) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
  return period;
}

async function statusOrThrow(tx: Prisma.TransactionClient, code: string) {
  const status = await tx.monitoringPeriodStatus.findUnique({ where: { code } });
  if (!status) throw new AppError(500, "MONITORING_WORKFLOW_STATUS_MISSING", `Monitoring status ${code} is not seeded`);
  return status;
}

function assertState(actual: string, expected: string) {
  if (actual !== expected) throw new AppError(409, "MONITORING_WORKFLOW_STATE_CONFLICT", `This action requires status ${expected}; current status is ${actual}`, { expected, actual });
}

async function updateVersioned(tx: Prisma.TransactionClient, id: bigint, version: number, data: Prisma.MonitoringPeriodUncheckedUpdateManyInput) {
  const updated = await tx.monitoringPeriod.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
  if (updated.count !== 1) throw new AppError(409, "MONITORING_PERIOD_VERSION_CONFLICT", "The Monitoring Period changed since it was loaded", { submittedVersion: version });
}

async function assertFindings(tx: Prisma.TransactionClient, id: bigint, run: { issues: Array<{ findingCode: string; exceptionAllowed: boolean }> }, body: ExceptionWorkflowBody, code: string) {
  // Old checks without manual-baseline warnings must be rerun before proceeding.
  const inputs = await tx.monitoringPeriodInput.findMany({where:{monitoringPeriodId:id},include:{baselineResolutions:{orderBy:{revisionNo:"desc"},take:1}}});
  const manualCount = inputs.filter(input => input.baselineResolutions[0]?.sourceType === "MANUAL").length;
  if (run.issues.filter(issue => issue.findingCode === "MANUAL_BASELINE_USED").length !== manualCount)
    throw new AppError(422, "VALIDATION_REQUIRED", "Run Check Results again to record manual baseline exceptions");
  const blocking = run.issues.filter(issue => !(body.withExceptions && issue.exceptionAllowed && ["RESULT_MISSING","MANUAL_BASELINE_USED"].includes(issue.findingCode)));
  if (blocking.length) throw new AppError(422, code, "Resolve blocking Check Results findings or explicitly justify eligible missing Results and manual baseline warnings", { blockingFindings: blocking.length });
  if (body.withExceptions && !run.issues.some(issue => ["RESULT_MISSING","MANUAL_BASELINE_USED"].includes(issue.findingCode) && issue.exceptionAllowed))
    throw new AppError(422, "CLOSE_EXCEPTION_NOT_REQUIRED", "No eligible findings require exceptions");
}

export const monitoringWorkflowService = {
  async submit(idValue: string, body: ExceptionWorkflowBody, actor: bigint) {
    body = exceptionWorkflowBodySchema.parse(body);
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "DRAFT");
      const run = await tx.monitoringValidationRun.findFirst({ where: { monitoringPeriodId: id }, orderBy: { runNo: "desc" }, include: { issues: { where: { blocksSubmit: true } } } });
      if (!run || !isCurrentRun(run,period) || !hasCurrentScoring(period) || !period.validationRunAt || !period.validationStatus || period.validationStatus === "STALE") throw new AppError(422, "VALIDATION_REQUIRED", "Run Check Results for the current Result version before submitting");
      await assertFindings(tx, id, run, body, "VALIDATION_FINDINGS_BLOCK_SUBMIT");
      const submitted = await statusOrThrow(tx, "SUBMITTED");
      await updateVersioned(tx, id, body.version, { statusId: submitted.id, submittedAt: new Date(), submittedByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "SUBMIT", fromStatusCode: "DRAFT", toStatusCode: "SUBMITTED", actorUserId: actor, comment: body.justification ?? null, metadata: { withExceptions: body.withExceptions ?? false, validationRunId: String(run.id), exceptionCodes: body.withExceptions ? [...new Set(run.issues.filter(issue=>issue.exceptionAllowed).map(issue=>issue.findingCode))] : [] } } });
      await writeMonitoringEvent(tx,"monitoring.period.submitted.v1",period,body.version+1,{status:"SUBMITTED",submittedByUserId:actor.toString()});
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async returnForCorrection(idValue: string, body: ReturnForCorrectionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      const draft = await statusOrThrow(tx, "DRAFT");
      await updateVersioned(tx, id, body.version, { statusId: draft.id, returnedAt: new Date(), returnedByUserId: actor, returnReason: body.reason });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "RETURN_FOR_CORRECTION", fromStatusCode: "SUBMITTED", toStatusCode: "DRAFT", comment: body.reason, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async approve(idValue: string, body: ExceptionWorkflowBody, actor: bigint) {
    body = exceptionWorkflowBodySchema.parse(body);
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      const run = await tx.monitoringValidationRun.findFirst({ where: { monitoringPeriodId: id }, orderBy: { runNo: "desc" }, include: { issues: { where: { blocksApproval: true } } } });
      if (!run || !isCurrentRun(run,period) || !hasCurrentScoring(period)) throw new AppError(422, "VALIDATION_FINDINGS_BLOCK_APPROVAL", "A current Check Results run is required for Approval");
      await assertFindings(tx, id, run, body, "VALIDATION_FINDINGS_BLOCK_APPROVAL");
      const validated = await statusOrThrow(tx, "VALIDATED");
      await updateVersioned(tx, id, body.version, { statusId: validated.id, validatedAt: new Date(), validatedByUserId: actor, validationStatus: body.withExceptions ? "VALIDATED_WITH_EXCEPTIONS" : period.validationStatus });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "APPROVE", fromStatusCode: "SUBMITTED", toStatusCode: "VALIDATED", actorUserId: actor, comment: body.justification ?? null, metadata: { withExceptions: body.withExceptions ?? false, validationRunId: String(run.id), exceptionCodes: body.withExceptions ? [...new Set(run.issues.filter(issue=>issue.exceptionAllowed).map(issue=>issue.findingCode))] : [] } } });
      await writeMonitoringEvent(tx,"monitoring.period.validated.v1",period,body.version+1,{status:"VALIDATED",validatedByUserId:actor.toString(),validationStatus:body.withExceptions?"VALIDATED_WITH_EXCEPTIONS":period.validationStatus});
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async close(idValue: string, body: CloseMonitoringPeriodBody, actor: bigint) {
    body = closeMonitoringPeriodBodySchema.parse(body);
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "VALIDATED");
      const missing = await tx.monitoringPeriodInput.count({ where: { monitoringPeriodId: id, OR: [{ result: null }, { result: { is: { resultValue: null } } }] } });
      if (missing && !body.withExceptions) throw new AppError(422, "MISSING_RESULTS_BLOCK_CLOSE", "Close with Exceptions is required while KPI results are missing", { missing });
      const run = await tx.monitoringValidationRun.findFirst({ where: { monitoringPeriodId: id }, orderBy: { runNo: "desc" }, include: { issues: { where: { OR: [{ blocksSubmit: true }, { blocksApproval: true }] } } } });
      if (!run || !isCurrentRun(run,period) || !hasCurrentScoring(period)) throw new AppError(422, "VALIDATION_REQUIRED", "Current Results must be checked before closing");
      await assertFindings(tx, id, run, body, "VALIDATION_FINDINGS_BLOCK_CLOSE");
      const closed = await statusOrThrow(tx, "CLOSED");
      const closedAt=new Date();
      await updateVersioned(tx, id, body.version, { statusId: closed.id, closedAt, closedByUserId: actor, closedWithExceptions: body.withExceptions, closeExceptionJustification: body.justification });
      const cards = await tx.monitoringPeriodScorecard.findMany({ where: { monitoringPeriodId: id } });
      for (const card of cards) await tx.monitoringPeriodScorecard.update({ where: { id: card.id }, data: { finalScorePercent: card.previewScorePercent } });
      await tx.monitoringPeriodClosure.create({data:{monitoringPeriodId:id,closureType:body.withExceptions?"WITH_EXCEPTIONS":"NORMAL",missingResultCount:missing,justification:body.justification,closedAt,closedByUserId:actor}});
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: body.withExceptions ? "CLOSE_WITH_EXCEPTIONS" : "CLOSE", fromStatusCode: "VALIDATED", toStatusCode: "CLOSED", comment: body.justification, metadata: { missing, validationRunId: String(run.id), exceptionCodes: body.withExceptions ? [...new Set(run.issues.filter(issue=>issue.exceptionAllowed).map(issue=>issue.findingCode))] : [] }, actorUserId: actor } });
      await writeMonitoringEvent(tx,"monitoring.period.closed.v1",period,body.version+1,{status:"CLOSED",closedAt:closedAt.toISOString(),closedByUserId:actor.toString(),closedWithExceptions:body.withExceptions,missingResultCount:missing,justification:body.justification});
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },
};

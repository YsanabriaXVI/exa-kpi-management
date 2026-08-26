import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { CloseMonitoringPeriodBody, ReturnForCorrectionBody, WorkflowVersionBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import { recalculatePeriodScores } from "./scoring.service.js";
import { resultEntryService } from "./result-entry.service.js";

type Finding = { monitoringPeriodInputId: string; kpiCode: string; severity: "WARNING" | "ERROR"; code: string; message: string };

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

export const monitoringWorkflowService = {
  async validate(idValue: string, body: WorkflowVersionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "DRAFT");
      if (period.version !== body.version) throw new AppError(409, "MONITORING_PERIOD_VERSION_CONFLICT", "The Monitoring Period changed since it was loaded");
      await recalculatePeriodScores(tx, id, "DRAFT");
      const inputs = await tx.monitoringPeriodInput.findMany({ where: { monitoringPeriodId: id }, include: { result: true }, orderBy: { displayOrder: "asc" } });
      const findings: Finding[] = [];
      for (const input of inputs) {
        if (!input.result || input.result.resultValue === null) findings.push({ monitoringPeriodInputId: input.id.toString(), kpiCode: input.kpiCodeSnapshot, severity: "WARNING", code: "RESULT_MISSING", message: "A required KPI result has not been entered" });
        else if (input.result.calculationStatus === "NOT_CALCULABLE") findings.push({ monitoringPeriodInputId: input.id.toString(), kpiCode: input.kpiCodeSnapshot, severity: "ERROR", code: input.result.calculationErrorCode ?? "SCORING_FAILED", message: "The KPI result could not be scored with its historical rule snapshot" });
      }
      const errors = findings.filter((item) => item.severity === "ERROR").length, warnings = findings.length - errors;
      const summary = { expected: inputs.length, passed: inputs.length - findings.length, pending: findings.filter((item) => item.code === "RESULT_MISSING").length, warnings, errors, findings };
      await updateVersioned(tx, id, body.version, { validationStatus: errors ? "ERRORS" : warnings ? "WITH_WARNINGS" : "PASSED", validationSummary: summary, validationRunAt: new Date(), validationRunByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "VALIDATE_DRAFT", fromStatusCode: "DRAFT", toStatusCode: "DRAFT", metadata: summary, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async submit(idValue: string, body: WorkflowVersionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "DRAFT");
      if (!period.validationRunAt || !period.validationStatus) throw new AppError(422, "VALIDATION_REQUIRED", "Run Validate before submitting results");
      if (period.validationStatus === "ERRORS") throw new AppError(422, "VALIDATION_ERRORS_BLOCK_SUBMIT", "Resolve validation errors before submitting");
      const submitted = await statusOrThrow(tx, "SUBMITTED");
      await updateVersioned(tx, id, body.version, { statusId: submitted.id, submittedAt: new Date(), submittedByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "SUBMIT", fromStatusCode: "DRAFT", toStatusCode: "SUBMITTED", actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async returnForCorrection(idValue: string, body: ReturnForCorrectionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      const draft = await statusOrThrow(tx, "DRAFT");
      await updateVersioned(tx, id, body.version, { statusId: draft.id, returnedAt: new Date(), returnedByUserId: actor, returnReason: body.reason, validationStatus: null, validationSummary: Prisma.JsonNull, validationRunAt: null, validationRunByUserId: null });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "RETURN_FOR_CORRECTION", fromStatusCode: "SUBMITTED", toStatusCode: "DRAFT", comment: body.reason, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async approve(idValue: string, body: WorkflowVersionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      if (period.validationStatus === "ERRORS") throw new AppError(422, "VALIDATION_ERRORS_BLOCK_APPROVAL", "Results with validation errors cannot be approved");
      const validated = await statusOrThrow(tx, "VALIDATED");
      await updateVersioned(tx, id, body.version, { statusId: validated.id, validatedAt: new Date(), validatedByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "APPROVE", fromStatusCode: "SUBMITTED", toStatusCode: "VALIDATED", actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async close(idValue: string, body: CloseMonitoringPeriodBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "VALIDATED");
      const missing = await tx.monitoringPeriodInput.count({ where: { monitoringPeriodId: id, OR: [{ result: null }, { result: { is: { resultValue: null } } }] } });
      if (missing && !body.withExceptions) throw new AppError(422, "MISSING_RESULTS_BLOCK_CLOSE", "Close with Exceptions is required while KPI results are missing", { missing });
      if (!missing && body.withExceptions) throw new AppError(422, "CLOSE_EXCEPTION_NOT_REQUIRED", "Close with Exceptions cannot be used when all results are complete");
      const closed = await statusOrThrow(tx, "CLOSED");
      await updateVersioned(tx, id, body.version, { statusId: closed.id, closedAt: new Date(), closedByUserId: actor, closedWithExceptions: body.withExceptions, closeExceptionJustification: body.justification });
      await recalculatePeriodScores(tx, id, "CLOSED");
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: body.withExceptions ? "CLOSE_WITH_EXCEPTIONS" : "CLOSE", fromStatusCode: "VALIDATED", toStatusCode: "CLOSED", comment: body.justification, metadata: { missing }, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },
};

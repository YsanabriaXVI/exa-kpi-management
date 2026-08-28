import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { CloseMonitoringPeriodBody, ReturnForCorrectionBody, WorkflowVersionBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import { recalculatePeriodScores } from "./scoring.service.js";
import { CALCULATION_VERSION } from "./scoring-engine.js";
import { resultEntryService } from "./result-entry.service.js";
import { writeMonitoringEvent } from "../outbox/outbox.writer.js";

type Severity = "PENDING" | "WARNING" | "ERROR" | "CRITICAL";
type Finding = { monitoringPeriodInputId: string; kpiConfigurationId: string; kpiCode: string; severity: Severity; code: string; message: string; details?: Prisma.InputJsonValue; blocksSubmit: boolean; blocksApproval: boolean; exceptionAllowed: boolean };

const scoringMessages: Record<string, string> = {
  SCORING_METHOD_NOT_CONFIGURED: "An approved scoring method is not present in the Monitoring snapshot.",
  SCORING_CONFIGURATION_NOT_APPROVED: "The business scoring configuration was not APPROVED when this Monitoring Period was materialized.",
  NEGATIVE_RESULT_POLICY_NOT_CONFIGURED: "The Result is negative and this KPI has no approved negative-value policy.",
  NEGATIVE_RESULT_NOT_ALLOWED: "The approved KPI policy does not allow negative Results.",
  NEGATIVE_RESULT_REQUIRES_REVIEW: "The approved KPI policy requires review of negative Results.",
  GOAL_REQUIRED: "The selected scoring method requires a Goal.",
  PROPORTIONAL_GOAL_NOT_POSITIVE: "Greater proportional scoring requires a positive Goal.",
  LOWER_PROPORTIONAL_GOAL_NOT_POSITIVE: "Lower proportional scoring requires a positive Goal.",
  ZERO_TARGET_REQUIRES_ZERO_GOAL: "Zero-target scoring requires Goal = 0.",
  SCORING_RULE_NOT_CONFIGURED: "The entered Result is not covered by an approved scoring band.",
  TOLERANCE_NOT_CONFIGURED: "Equal scoring requires an approved non-negative tolerance and penalty bands.",
  RANGE_NOT_CONFIGURED: "Range scoring requires valid minimum and maximum targets and penalty bands.",
  TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED: "Compliance cannot be mapped through the snapshotted Traffic Light thresholds.",
  UNSUPPORTED_SCORING_METHOD: "The snapshotted scoring method is not supported by approved Scoring Rules V1.",
};

function findingFor(input: any): Finding | null {
  const base = { monitoringPeriodInputId: input.id.toString(), kpiConfigurationId: input.kpiConfigurationExternalId.toString(), kpiCode: input.kpiCodeSnapshot };
  if (!input.result || input.result.resultValue === null) return {
    ...base, severity: input.isRequired ? "WARNING" : "PENDING", code: input.isRequired ? "RESULT_MISSING" : "OPTIONAL_RESULT_MISSING",
    message: input.isRequired ? "A required KPI Result has not been entered." : "An optional KPI Result has not been entered.",
    blocksSubmit: input.isRequired, blocksApproval: input.isRequired, exceptionAllowed: !input.isRequired,
  };
  if (input.result.calculationStatus === "NOT_CALCULABLE") {
    const code = input.result.calculationErrorCode ?? "SCORING_FAILED";
    return { ...base, severity: "CRITICAL", code, message: scoringMessages[code] ?? "The KPI Result cannot be scored with its immutable configuration snapshot.", details: { calculationVersion: input.result.calculationVersion ?? CALCULATION_VERSION }, blocksSubmit: true, blocksApproval: true, exceptionAllowed: false };
  }
  return null;
}

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
      const findings = inputs.map(findingFor).filter((item): item is Finding => item !== null);
      const counts = (severity: Severity) => findings.filter((item) => item.severity === severity).length;
      const summary = { expected: inputs.length, passed: inputs.length - findings.length, missing: findings.filter((item) => item.code === "RESULT_MISSING" || item.code === "OPTIONAL_RESULT_MISSING").length, warnings: counts("WARNING"), errors: counts("ERROR"), critical: counts("CRITICAL"), pending: counts("PENDING"), scoring: { calculated: inputs.filter((input) => input.result?.calculationStatus === "CALCULATED").length, missing: inputs.filter((input) => !input.result || input.result.calculationStatus === "MISSING").length, notCalculable: inputs.filter((input) => input.result?.calculationStatus === "NOT_CALCULABLE").length }, blocking: findings.filter((item) => item.blocksSubmit).length };
      await tx.monitoringValidationRun.updateMany({ where: { monitoringPeriodId: id, status: "CURRENT" }, data: { status: "SUPERSEDED", invalidatedAt: new Date() } });
      const aggregate = await tx.monitoringValidationRun.aggregate({ where: { monitoringPeriodId: id }, _max: { runNo: true } });
      const run = await tx.monitoringValidationRun.create({ data: { monitoringPeriodId: id, runNo: (aggregate._max.runNo ?? 0) + 1, resultsVersion: body.version, status: "CURRENT", calculationVersion: CALCULATION_VERSION, summary, createdByUserId: actor } });
      if (findings.length) await tx.monitoringValidationIssue.createMany({ data: findings.map((finding) => ({ validationRunId: run.id, monitoringPeriodId: id, monitoringPeriodInputId: BigInt(finding.monitoringPeriodInputId), kpiConfigurationExternalId: BigInt(finding.kpiConfigurationId), findingCode: finding.code, severity: finding.severity, message: finding.message, details: finding.details, blocksSubmit: finding.blocksSubmit, blocksApproval: finding.blocksApproval, exceptionAllowed: finding.exceptionAllowed })) });
      const validationStatus = summary.blocking ? "BLOCKED" : findings.length ? "WITH_WARNINGS" : "PASSED";
      await updateVersioned(tx, id, body.version, { validationStatus, validationSummary: summary, validationRunAt: new Date(), validationRunByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "VALIDATE_DRAFT", fromStatusCode: "DRAFT", toStatusCode: "DRAFT", metadata: summary, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async submit(idValue: string, body: WorkflowVersionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "DRAFT");
      const run = await tx.monitoringValidationRun.findFirst({ where: { monitoringPeriodId: id, status: "CURRENT" }, orderBy: { runNo: "desc" }, include: { issues: { where: { blocksSubmit: true }, select: { id: true } } } });
      if (!run || !period.validationRunAt || !period.validationStatus || period.validationStatus === "STALE") throw new AppError(422, "VALIDATION_REQUIRED", "Run Check Results for the current Result version before submitting");
      if (run.issues.length) throw new AppError(422, "VALIDATION_FINDINGS_BLOCK_SUBMIT", "Resolve blocking Check Results findings before submitting", { validationRunId: run.id.toString(), blockingFindings: run.issues.length });
      const submitted = await statusOrThrow(tx, "SUBMITTED");
      await updateVersioned(tx, id, body.version, { statusId: submitted.id, submittedAt: new Date(), submittedByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "SUBMIT", fromStatusCode: "DRAFT", toStatusCode: "SUBMITTED", actorUserId: actor } });
      await writeMonitoringEvent(tx,"monitoring.period.submitted.v1",period,body.version+1,{status:"SUBMITTED",submittedByUserId:actor.toString()});
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async returnForCorrection(idValue: string, body: ReturnForCorrectionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      const draft = await statusOrThrow(tx, "DRAFT");
      await updateVersioned(tx, id, body.version, { statusId: draft.id, returnedAt: new Date(), returnedByUserId: actor, returnReason: body.reason, validationStatus: null, validationSummary: Prisma.JsonNull, validationRunAt: null, validationRunByUserId: null });
      await tx.monitoringValidationRun.updateMany({ where: { monitoringPeriodId: id, status: "CURRENT" }, data: { status: "STALE", invalidatedAt: new Date() } });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "RETURN_FOR_CORRECTION", fromStatusCode: "SUBMITTED", toStatusCode: "DRAFT", comment: body.reason, actorUserId: actor } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },

  async approve(idValue: string, body: WorkflowVersionBody, actor: bigint) {
    const id = BigInt(idValue);
    await prisma.$transaction(async (tx) => {
      const period = await periodOrThrow(tx, id); assertState(period.status.code, "SUBMITTED");
      const run = await tx.monitoringValidationRun.findFirst({ where: { monitoringPeriodId: id, status: "CURRENT" }, include: { issues: { where: { blocksApproval: true }, select: { id: true } } } });
      if (!run || run.issues.length) throw new AppError(422, "VALIDATION_FINDINGS_BLOCK_APPROVAL", "A current Check Results run without blocking findings is required for Approval");
      const validated = await statusOrThrow(tx, "VALIDATED");
      await updateVersioned(tx, id, body.version, { statusId: validated.id, validatedAt: new Date(), validatedByUserId: actor });
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: "APPROVE", fromStatusCode: "SUBMITTED", toStatusCode: "VALIDATED", actorUserId: actor } });
      await writeMonitoringEvent(tx,"monitoring.period.validated.v1",period,body.version+1,{status:"VALIDATED",validatedByUserId:actor.toString(),validationStatus:period.validationStatus});
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
      const closedAt=new Date();
      await updateVersioned(tx, id, body.version, { statusId: closed.id, closedAt, closedByUserId: actor, closedWithExceptions: body.withExceptions, closeExceptionJustification: body.justification });
      await recalculatePeriodScores(tx, id, "CLOSED");
      await tx.monitoringPeriodClosure.create({data:{monitoringPeriodId:id,closureType:body.withExceptions?"WITH_EXCEPTIONS":"NORMAL",missingResultCount:missing,justification:body.justification,closedAt,closedByUserId:actor}});
      await tx.monitoringPeriodWorkflowEvent.create({ data: { monitoringPeriodId: id, actionCode: body.withExceptions ? "CLOSE_WITH_EXCEPTIONS" : "CLOSE", fromStatusCode: "VALIDATED", toStatusCode: "CLOSED", comment: body.justification, metadata: { missing }, actorUserId: actor } });
      await writeMonitoringEvent(tx,"monitoring.period.closed.v1",period,body.version+1,{status:"CLOSED",closedAt:closedAt.toISOString(),closedByUserId:actor.toString(),closedWithExceptions:body.withExceptions,missingResultCount:missing,justification:body.justification});
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return resultEntryService.get(idValue);
  },
};

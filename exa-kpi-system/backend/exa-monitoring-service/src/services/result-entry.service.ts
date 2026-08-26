import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { SaveResultEntryBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
import { recalculatePeriodScores } from "./scoring.service.js";

const resultEntryInclude = {
  status: true,
  scorecards: { orderBy: { scorecardCodeSnapshot: "asc" as const } },
  inputs: {
    orderBy: { displayOrder: "asc" as const },
    include: { result: true, scorecard: true },
  },
};

function serialize(row: any) {
  const inputs = row.inputs.map((input: any) => ({
    id: input.id.toString(),
    scorecardId: input.scorecard.scorecardExternalId.toString(),
    scorecardCode: input.scorecard.scorecardCodeSnapshot,
    scorecardName: input.scorecard.scorecardNameSnapshot,
    kpiConfigurationId: input.kpiConfigurationExternalId.toString(),
    configCode: input.configCodeSnapshot,
    kpiCode: input.kpiCodeSnapshot,
    kpiName: input.kpiNameSnapshot,
    goal: input.goalTextSnapshot ?? input.goalValueSnapshot?.toString() ?? null,
    unit: input.measurementUnitSymbolSnapshot ?? input.measurementUnitNameSnapshot,
    dataSource: input.primaryDataSourceNameSnapshot,
    resultValue: input.result?.resultValue?.toString() ?? null,
    comment: input.result?.comment ?? null,
    version: input.result?.version ?? null,
    entryStatus: input.result?.resultValue !== null && input.result?.resultValue !== undefined ? "ENTERED" : "PENDING",
    scoring: input.result ? {
      status: input.result.calculationStatus,
      errorCode: input.result.calculationErrorCode,
      version: input.result.calculationVersion,
      rawAchievementPercent: input.result.rawAchievementPercent?.toString() ?? null,
      compliancePercent: input.result.compliancePercent?.toString() ?? null,
      weightedScorePoints: input.result.weightedScorePoints?.toString() ?? null,
      trafficLight: input.result.trafficLightCode,
    } : null,
  }));
  const entered = inputs.filter((input: any) => input.entryStatus === "ENTERED").length;
  return {
    monitoringPeriod: {
      id: row.id.toString(),
      code: `MP-${row.poolCodeSnapshot}-${row.periodKey}`,
      poolId: row.kpiPoolExternalId.toString(),
      poolCode: row.poolCodeSnapshot,
      poolName: row.poolNameSnapshot,
      poolInputPeriodId: row.poolInputPeriodExternalId.toString(),
      periodKey: row.periodKey,
      periodLabel: row.periodLabel,
      periodStart: row.periodStart.toISOString().slice(0, 10),
      periodEnd: row.periodEnd.toISOString().slice(0, 10),
      status: row.status.code,
      version: row.version,
      validationStatus: row.validationStatus,
      validationSummary: row.validationSummary,
      validationRunAt: row.validationRunAt?.toISOString() ?? null,
      returnReason: row.returnReason,
      closedWithExceptions: row.closedWithExceptions,
      closeExceptionJustification: row.closeExceptionJustification,
    },
    scorecards: row.scorecards.map((item: any) => ({ id: item.id.toString(), code: item.scorecardCodeSnapshot, name: item.scorecardNameSnapshot, directScorePercent: item.directScorePercent?.toString() ?? null, linkedScorePercent: item.linkedScorePercent?.toString() ?? null, previewScorePercent: item.previewScorePercent?.toString() ?? null, finalScorePercent: item.finalScorePercent?.toString() ?? null, calculationVersion: item.calculationVersion })),
    inputs,
    summary: { expected: inputs.length, entered, pending: inputs.length - entered },
  };
}

async function findPeriod(id: bigint) {
  return prisma.monitoringPeriod.findUnique({ where: { id }, include: resultEntryInclude });
}

function sameDecimal(left: Prisma.Decimal | null, right: Prisma.Decimal | null) {
  return left === null ? right === null : right !== null && left.equals(right);
}

export const resultEntryService = {
  async listPeriods() {
    const rows = await prisma.monitoringPeriod.findMany({ orderBy: [{ periodStart: "desc" }, { poolCodeSnapshot: "asc" }], include: { status: true, inputs: { select: { result: { select: { resultValue: true } } } } } });
    return rows.map((row) => {
      const entered = row.inputs.filter((input) => input.result?.resultValue !== null && input.result?.resultValue !== undefined).length;
      return { id: row.id.toString(), code: `MP-${row.poolCodeSnapshot}-${row.periodKey}`, poolId: row.kpiPoolExternalId.toString(), poolInputPeriodId: row.poolInputPeriodExternalId.toString(), poolCode: row.poolCodeSnapshot, poolName: row.poolNameSnapshot, periodKey: row.periodKey, periodLabel: row.periodLabel, periodStart: row.periodStart.toISOString().slice(0, 10), periodEnd: row.periodEnd.toISOString().slice(0, 10), status: row.status.code, frequency: row.inputFrequencyNameSnapshot, expected: row.inputs.length, entered, pending: row.inputs.length - entered };
    });
  },
  async get(idValue: string) {
    const row = await findPeriod(BigInt(idValue));
    if (!row) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    return serialize(row);
  },

  async save(idValue: string, body: SaveResultEntryBody, actor: bigint, source: "MANUAL" | "EXCEL" = "MANUAL") {
    const periodId = BigInt(idValue);
    const inputIds = body.changes.map((change) => BigInt(change.monitoringPeriodInputId));
    if (new Set(inputIds.map(String)).size !== inputIds.length) {
      throw new AppError(422, "DUPLICATE_RESULT_CHANGE", "A Monitoring input may only appear once per Save Changes batch");
    }

    await prisma.$transaction(async (tx) => {
      const period = await tx.monitoringPeriod.findUnique({ where: { id: periodId }, include: { status: true } });
      if (!period) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
      if (period.status.code !== "DRAFT") throw new AppError(409, "MONITORING_PERIOD_NOT_DRAFT", "Results can only be changed while the Monitoring Period is DRAFT");

      const inputs = await tx.monitoringPeriodInput.findMany({ where: { id: { in: inputIds }, monitoringPeriodId: periodId }, include: { result: true } });
      if (inputs.length !== inputIds.length) throw new AppError(422, "MONITORING_INPUT_NOT_IN_PERIOD", "Every changed input must belong to the requested Monitoring Period");
      const byId = new Map(inputs.map((input) => [input.id.toString(), input]));
      const normalized = body.changes.map((change) => {
        const input = byId.get(change.monitoringPeriodInputId)!;
        const nextValue = change.resultValue === null ? null : new Prisma.Decimal(change.resultValue);
        const nextComment = change.comment?.trim() || null;
        if (input.result ? change.version !== input.result.version : change.version !== null) {
          throw new AppError(409, "RESULT_VERSION_CONFLICT", "A result changed since it was loaded", { monitoringPeriodInputId: change.monitoringPeriodInputId, kpiCode: input.kpiCodeSnapshot, submittedVersion: change.version, currentVersion: input.result?.version ?? null, currentResultValue: input.result?.resultValue?.toString() ?? null, currentComment: input.result?.comment ?? null });
        }
        if (input.result && sameDecimal(input.result.resultValue, nextValue) && input.result.comment === nextComment) {
          throw new AppError(422, "RESULT_CHANGE_IS_NOOP", "Save Changes contains a row with no effective change", { monitoringPeriodInputId: change.monitoringPeriodInputId });
        }
        return { change, input, nextValue, nextComment };
      });

      const [method, batchStatus, rowStatus, pendingStatus, enteredStatus] = await Promise.all([
        tx.monitoringInputMethod.findUnique({ where: { code: source } }),
        tx.resultEntryBatchStatus.findUnique({ where: { code: "IMPORTED" } }),
        tx.resultEntryRowStatus.findUnique({ where: { code: "VALID" } }),
        tx.kpiResultStatus.findUnique({ where: { code: "PENDING" } }),
        tx.kpiResultStatus.findUnique({ where: { code: "ENTERED" } }),
      ]);
      if (!method || !batchStatus || !rowStatus || !pendingStatus || !enteredStatus) throw new AppError(500, "RESULT_ENTRY_CATALOG_MISSING", "Result Entry catalogs are not seeded");
      const aggregate = await tx.resultEntryBatch.aggregate({ where: { monitoringPeriodId: periodId }, _max: { batchNo: true } });
      const batch = await tx.resultEntryBatch.create({ data: { monitoringPeriodId: periodId, monitoringInputMethodId: method.id, statusId: batchStatus.id, batchNo: (aggregate._max.batchNo ?? 0) + 1, totalRows: normalized.length, validRows: normalized.length, createdByUserId: actor } });

      for (const item of normalized) {
        const batchRow = await tx.resultEntryBatchRow.create({ data: { resultEntryBatchId: batch.id, monitoringPeriodInputId: item.input.id, statusId: rowStatus.id, parsedResultValue: item.nextValue, rawComment: item.nextComment } });
        const statusId = item.nextValue === null ? pendingStatus.id : enteredStatus.id;
        if (!item.input.result) {
          const result = await tx.kpiResult.create({ data: { monitoringPeriodInputId: item.input.id, latestBatchRowId: batchRow.id, statusId, resultValue: item.nextValue, comment: item.nextComment, revisionNo: 1, version: 1, createdByUserId: actor } });
          await tx.kpiResultRevision.create({ data: { kpiResultId: result.id, resultEntryBatchRowId: batchRow.id, revisionNo: 1, previousResultValue: null, newResultValue: item.nextValue, previousComment: null, newComment: item.nextComment, changeType: "CREATE", entrySource: source, changedByUserId: actor } });
        } else {
          const previous = item.input.result;
          const updated = await tx.kpiResult.updateMany({ where: { id: previous.id, version: previous.version }, data: { latestBatchRowId: batchRow.id, statusId, resultValue: item.nextValue, comment: item.nextComment, revisionNo: { increment: 1 }, version: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
          if (updated.count !== 1) throw new AppError(409, "RESULT_VERSION_CONFLICT", "A result changed while Save Changes was being committed", { monitoringPeriodInputId: item.change.monitoringPeriodInputId });
          const changeType = previous.resultValue !== null && item.nextValue === null ? "CLEAR" : sameDecimal(previous.resultValue, item.nextValue) ? "COMMENT_ONLY" : "UPDATE";
          await tx.kpiResultRevision.create({ data: { kpiResultId: previous.id, resultEntryBatchRowId: batchRow.id, revisionNo: previous.revisionNo + 1, previousResultValue: previous.resultValue, newResultValue: item.nextValue, previousComment: previous.comment, newComment: item.nextComment, changeType, entrySource: source, changedByUserId: actor } });
        }
      }
      await tx.resultEntryBatch.update({ where: { id: batch.id }, data: { finishedAt: new Date() } });
      await recalculatePeriodScores(tx, periodId, period.status.code);
      await tx.monitoringPeriod.update({ where: { id: periodId }, data: { validationStatus: null, validationSummary: Prisma.JsonNull, validationRunAt: null, validationRunByUserId: null, version: { increment: 1 } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const saved = await findPeriod(periodId);
    if (!saved) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    return serialize(saved);
  },
};

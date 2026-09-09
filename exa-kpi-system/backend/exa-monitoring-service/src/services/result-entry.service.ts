import { contributionContractError, isContributingEvaluation } from "../contracts/entity-participation.js";
import { sumContributorResults } from "./contributor-results.js";
import { calculateDivision, divisionDefinition } from "./result-calculation.js";
import { baselineContext } from "./historical-baseline.service.js";
import { evaluationUnits } from "../contracts/evaluation-units.js";
import { historicalContractError } from "../contracts/historical-contract.js";
import { clearCurrentScoring, hasCurrentScoring, maskStaleScoring, isCurrentRun } from "./scoring-validity.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { saveResultEntryBodySchema, type SaveResultEntryBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";

function entryBlock(input: any): string | null {
  if (input.evaluationKindSnapshot === "GROUP") return "GROUP_RESULT_RUNTIME_UNSUPPORTED";
  const frozen = input.effectiveSettingsSnapshot;
  if (frozen?.executability?.executable === false) return "KPI_CONFIGURATION_NOT_EXECUTABLE";
  const contributionError = contributionContractError(frozen);
  if (contributionError) return contributionError;
  if (historicalContractError(frozen)) return "HISTORICAL_CONTRACT_INVALID";
  return null;
}

const resultEntryInclude = {
  status: true,
  validationRuns: { orderBy: { runNo: "desc" as const }, take: 1, include: { issues: { orderBy: { id: "asc" as const }, include: { input: { select: { kpiCodeSnapshot: true, kpiNameSnapshot: true } } } } } },
  scorecards: { orderBy: { scorecardCodeSnapshot: "asc" as const } },
  inputs: {
    orderBy: { displayOrder: "asc" as const },
    include: { result: true, scorecard: true, baselineResolutions: { orderBy: { revisionNo: "desc" as const }, take: 1 } },
  },
};

function serialize(row: any) {
  maskStaleScoring(row);
  const latestValidationRun = row.validationRuns?.[0] ?? null;
  const checkStatus = !latestValidationRun ? "NOT_CHECKED" : isCurrentRun(latestValidationRun, row) ? "CURRENT" : "STALE";
  const snapshot = checkStatus === "CURRENT" ? latestValidationRun?.scoringSnapshot : null;
  const inputs = row.inputs.filter((input: any) => input.evaluationKindSnapshot !== "GROUP").map((input: any) => ({
    id: input.id.toString(),
    scorecardId: input.scorecard.scorecardExternalId.toString(),
    scorecardCode: input.scorecard.scorecardCodeSnapshot,
    scorecardName: input.scorecard.scorecardNameSnapshot,
    kpiConfigurationId: input.kpiConfigurationExternalId.toString(),
    configCode: input.evaluationKindSnapshot !== "ENTITY" ? input.configCodeSnapshot : `${input.configCodeSnapshot}:${input.subjectCodeSnapshot ?? input.subjectExternalIdSnapshot ?? "GROUP"}`,
    kpiCode: input.evaluationKindSnapshot !== "ENTITY" ? input.kpiCodeSnapshot : `${input.kpiCodeSnapshot} · ${input.subjectLabelSnapshot}`,
    kpiName: input.kpiNameSnapshot,
    parentKpiCode: input.kpiCodeSnapshot,
    weight: input.weightPercentSnapshot?.toString() ?? null,
    goalUnit: evaluationUnits(input.effectiveSettingsSnapshot,input.subjectExternalIdSnapshot).goalUnit?.symbol ?? null,
    groupGoal: input.effectiveSettingsSnapshot?.groupGoal ?? null,
    entityEvaluationMode: input.effectiveSettingsSnapshot?.entityEvaluationMode ?? (input.evaluationKindSnapshot === "ENTITY" ? "INDIVIDUAL" : null),
    entityAggregation: isContributingEvaluation(input.effectiveSettingsSnapshot) ? "SUM" : null,
    contributors: isContributingEvaluation(input.effectiveSettingsSnapshot) ? (input.effectiveSettingsSnapshot.subjects ?? []).map((s: any) => ({...s, subjectType: input.effectiveSettingsSnapshot.subjectType})) : [],
    contributorValues: isContributingEvaluation(input.effectiveSettingsSnapshot) ? input.result?.inputValues?.contributors ?? [] : [],
    entryBlock: entryBlock(input),
    periodScope: input.effectiveSettingsSnapshot?.periodScope ?? null,
    comparisonDirection: input.effectiveSettingsSnapshot?.comparisonDirection ?? null,
    historical: baselineContext(row,input,input.baselineResolutions?.[0]),
    evaluationKind: input.evaluationKindSnapshot,
    subject: input.subjectLabelSnapshot ? { type: input.subjectTypeSnapshot, id: input.subjectExternalIdSnapshot, code: input.subjectCodeSnapshot, label: input.subjectLabelSnapshot } : null,
    goal: input.goalTextSnapshot ?? input.goalValueSnapshot?.toString() ?? null,
    unit: input.measurementUnitSymbolSnapshot ?? input.measurementUnitNameSnapshot,
    dataSource: input.primaryDataSourceNameSnapshot,
    resultValue: input.result?.resultValue?.toString() ?? null,
    resultMethod: input.effectiveSettingsSnapshot?.resultMethod ?? "DIRECT",
    resultSemantics: input.effectiveSettingsSnapshot?.resultSemantics ?? null,
    measurementInputs: divisionDefinition(input.effectiveSettingsSnapshot),
    inputValues: isContributingEvaluation(input.effectiveSettingsSnapshot) ? null : input.result?.inputValues ?? null,
    resultCalculation: divisionDefinition(input.effectiveSettingsSnapshot) ? { errorCode: calculateDivision(input.result?.inputValues).errorCode } : null,
    comment: input.result?.comment ?? null,
    version: input.result?.version ?? null,
    entryStatus: input.result?.resultValue !== null && input.result?.resultValue !== undefined ? "ENTERED" : "PENDING",
    scoring: input.result && hasCurrentScoring(row) ? {
      goalMet: input.result.goalMet,
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
    check: { status: checkStatus, runId: latestValidationRun?.id.toString() ?? null, runNo: latestValidationRun?.runNo ?? null, basedOnResultsVersion: latestValidationRun?.basedOnResultsVersion ?? null, basedOnBaselineVersion: latestValidationRun?.basedOnBaselineVersion ?? null,
      summary: snapshot?.summary ?? null, evaluations: snapshot?.evaluations ?? [], scorecards: snapshot?.scorecards ?? [], findings: snapshot?.findings ?? [] },
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
      resultsVersion: row.resultsVersion,
      baselineVersion: row.baselineVersion ?? 0,
      currentScoring: { basedOnResultsVersion: row.currentScoringResultsVersion ?? null, basedOnBaselineVersion: row.currentScoringBaselineVersion ?? null, status: checkStatus },
      selectedEntryMethod: row.selectedEntryMethod,
      validationStatus: row.validationStatus,
      validationSummary: row.validationSummary,
      validationRunAt: row.validationRunAt?.toISOString() ?? null,
      validationRun: latestValidationRun ? {
        id: latestValidationRun.id.toString(),
        runNo: latestValidationRun.runNo,
        basedOnResultsVersion: latestValidationRun.basedOnResultsVersion ?? null,
        basedOnBaselineVersion: latestValidationRun.basedOnBaselineVersion ?? 0,
        scoringSnapshot: latestValidationRun.scoringSnapshot ?? null,
        status: checkStatus,
        calculationVersion: latestValidationRun.calculationVersion,
        createdAt: latestValidationRun.createdAt.toISOString(),
        invalidatedAt: latestValidationRun.invalidatedAt?.toISOString() ?? null,
        summary: latestValidationRun.summary,
        findings: latestValidationRun.issues.map((issue: any) => ({
          id: issue.id.toString(), monitoringPeriodInputId: issue.monitoringPeriodInputId?.toString() ?? null,
          kpiConfigurationId: issue.kpiConfigurationExternalId?.toString() ?? null,
          kpiCode: issue.input?.kpiCodeSnapshot ?? null, kpiName: issue.input?.kpiNameSnapshot ?? null,
          code: issue.findingCode, severity: issue.severity, message: issue.message, details: issue.details,
          blocksSubmit: issue.blocksSubmit, blocksApproval: issue.blocksApproval, exceptionAllowed: issue.exceptionAllowed,
        })),
      } : null,
      returnReason: row.returnReason,
      closedWithExceptions: row.closedWithExceptions,
      closeExceptionJustification: row.closeExceptionJustification,
    },
    scorecards: row.scorecards.map((item: any) => ({ id: item.id.toString(), code: item.scorecardCodeSnapshot, name: item.scorecardNameSnapshot, departments:item.departmentsSnapshot??[], directScorePercent: item.directScorePercent?.toString() ?? null, linkedScorePercent: item.linkedScorePercent?.toString() ?? null, previewScorePercent: item.previewScorePercent?.toString() ?? null, finalScorePercent: item.finalScorePercent?.toString() ?? null, calculationVersion: item.calculationVersion })),
    inputs,
    summary: { expected: inputs.length, entered, pending: inputs.length - entered, completionPercent: inputs.length ? Math.round(entered / inputs.length * 100) : 0 },
  };
}

async function findPeriod(id: bigint) {
  return prisma.monitoringPeriod.findUnique({ where: { id }, include: resultEntryInclude });
}

function sameDecimal(left: Prisma.Decimal | null, right: Prisma.Decimal | null) {
  return left === null ? right === null : right !== null && left.equals(right);
}
function sameInputs(left: unknown, right: unknown) {
  const pair = (value: any) => value == null ? null : value.aggregation === "SUM" ? value.contributors : [value.numerator ?? null, value.denominator ?? null];
  return JSON.stringify(pair(left)) === JSON.stringify(pair(right));
}

export const resultEntryService = {
  async listPeriods() {
    const rows = await prisma.monitoringPeriod.findMany({ orderBy: [{ periodStart: "desc" }, { poolCodeSnapshot: "asc" }], include: { status: true, inputs: { where: { evaluationKindSnapshot: { not: "GROUP" } }, select: { result: { select: { resultValue: true } } } } } });
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
    if (source !== "MANUAL") throw new AppError(409, "ENTRY_METHOD_NOT_SUPPORTED", "Only Manual Result Entry is available in V1");
    body = saveResultEntryBodySchema.parse(body);
    const periodId = BigInt(idValue);
    const inputIds = body.changes.map((change) => BigInt(change.monitoringPeriodInputId));
    if (new Set(inputIds.map(String)).size !== inputIds.length) {
      throw new AppError(422, "DUPLICATE_RESULT_CHANGE", "A Monitoring input may only appear once per Save Changes batch");
    }

    try { await prisma.$transaction(async (tx) => {
      const period = await tx.monitoringPeriod.findUnique({ where: { id: periodId }, include: { status: true } });
      if (!period) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
      if (period.status.code !== "DRAFT") throw new AppError(409, "MONITORING_PERIOD_NOT_DRAFT", "Results can only be changed while the Monitoring Period is DRAFT");
      if (period.selectedEntryMethod && period.selectedEntryMethod !== "MANUAL") throw new AppError(409, "ENTRY_METHOD_CONFLICT", "This draft already uses another entry method");
      if (period.resultsVersion !== body.resultsVersion) throw new AppError(409, "RESULT_VERSION_CONFLICT", "Results changed since this period was loaded", { currentResultsVersion: period.resultsVersion });
      const legacyExcel = await tx.resultEntryBatch.findFirst({ where: { monitoringPeriodId: periodId, method: { code: "EXCEL" } }, select: { id: true } });
      if (legacyExcel) throw new AppError(409, "ENTRY_METHOD_CONFLICT", "This existing draft contains Excel batches and cannot switch to Manual");

      const inputs = await tx.monitoringPeriodInput.findMany({ where: { id: { in: inputIds }, monitoringPeriodId: periodId }, include: { result: true } });
      if (inputs.length !== inputIds.length) throw new AppError(422, "MONITORING_INPUT_NOT_IN_PERIOD", "Every changed input must belong to the requested Monitoring Period");
      const byId = new Map(inputs.map((input) => [input.id.toString(), input]));
      const normalized = body.changes.map((change) => {
        const input = byId.get(change.monitoringPeriodInputId)!;
        const blocked = entryBlock(input);
        if (blocked) throw new AppError(409, blocked, "This frozen evaluation does not support Manual Result Entry V1");
        const settings = input.effectiveSettingsSnapshot as any;
        const contributing = isContributingEvaluation(settings);
        if (!contributing && change.contributorValues) throw new AppError(422, "CONTRIBUTOR_INPUTS_NOT_ALLOWED", "This evaluation has no contributor inputs");
        if (contributing && (change.inputValues || change.resultValue !== null)) throw new AppError(422, "OFFICIAL_RESULT_READ_ONLY", "The official Result is the SUM of contributor values");
        if (contributing && !change.contributorValues) throw new AppError(422, "CONTRIBUTOR_INPUTS_REQUIRED", "Send the frozen contributor values, leaving missing results null");
        const contribution = contributing ? sumContributorResults(settings, change.contributorValues) : null;
        if (contribution?.errorCode && contribution.errorCode !== "CONTRIBUTOR_RESULT_MISSING") throw new AppError(422, contribution.errorCode, "Enter one valid result or null for each frozen contributor");
        const division = divisionDefinition(settings);
        if (settings?.resultMethod === "CALCULATED_FROM_INPUTS" && !division) throw new AppError(422, "RESULT_METHOD_NOT_SUPPORTED", "Only an ordered division of two inputs is supported");
        if (division && !change.inputValues) throw new AppError(422, "RESULT_INPUTS_REQUIRED", "Enter the numerator and denominator, leaving missing values null");
        if (!division && change.inputValues) throw new AppError(422, "RESULT_INPUTS_NOT_ALLOWED", "This evaluation requires a direct Result");
        const nextInputs = contribution ? { aggregation: "SUM", contributors: contribution.values } : division ? change.inputValues! : null;
        const nextValue = contribution ? contribution.value : division ? calculateDivision(change.inputValues!).value : change.resultValue === null ? null : new Prisma.Decimal(change.resultValue);
        if (!division && settings?.resultSemantics === "BINARY" && nextValue !== null && !nextValue.eq(0) && !nextValue.eq(1)) throw new AppError(422, "BINARY_RESULT_INVALID", "Select Yes (1) or No (0)");
        const nextComment = input.result?.comment ?? null;
        if (change.comment !== undefined && change.comment !== nextComment) throw new AppError(422, "RESULT_ONLY_EDITABLE", "Only Result can be edited in Manual Entry V1");
        if (input.result ? change.version !== input.result.version : change.version !== null) {
          throw new AppError(409, "RESULT_VERSION_CONFLICT", "A result changed since it was loaded", { monitoringPeriodInputId: change.monitoringPeriodInputId, kpiCode: input.kpiCodeSnapshot, submittedVersion: change.version, currentVersion: input.result?.version ?? null, currentResultValue: input.result?.resultValue?.toString() ?? null, currentComment: input.result?.comment ?? null });
        }
        return { change, input, nextValue, nextComment, nextInputs };
      }).filter(item => !sameDecimal(item.input.result?.resultValue ?? null, item.nextValue) || !sameInputs(item.input.result?.inputValues, item.nextInputs));

      if (!normalized.length && period.selectedEntryMethod === "MANUAL") return;
      const claimed = await tx.monitoringPeriod.updateMany({ where: { id: periodId, version: period.version, resultsVersion: body.resultsVersion, statusId: period.statusId }, data: { selectedEntryMethod: "MANUAL", version: { increment: 1 }, resultsVersion: { increment: normalized.length ? 1 : 0 } } });
      if (claimed.count !== 1) throw new AppError(409, "RESULT_VERSION_CONFLICT", "The period changed while saving; reload and try again");
      if (!normalized.length) return;

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
        const batchRow = await tx.resultEntryBatchRow.create({ data: { resultEntryBatchId: batch.id, monitoringPeriodInputId: item.input.id, statusId: rowStatus.id, parsedResultValue: item.nextValue, inputValues: item.nextInputs ?? Prisma.JsonNull, rawComment: item.nextComment } });
        const statusId = item.nextValue === null ? pendingStatus.id : enteredStatus.id;
        if (!item.input.result) {
          const result = await tx.kpiResult.create({ data: { monitoringPeriodInputId: item.input.id, latestBatchRowId: batchRow.id, statusId, resultValue: item.nextValue, inputValues: item.nextInputs ?? Prisma.JsonNull, comment: item.nextComment, revisionNo: 1, version: 1, createdByUserId: actor } });
          await tx.kpiResultRevision.create({ data: { kpiResultId: result.id, resultEntryBatchRowId: batchRow.id, revisionNo: 1, previousResultValue: null, newResultValue: item.nextValue, previousComment: null, newComment: item.nextComment, changeType: "CREATE", entrySource: source, changedByUserId: actor } });
        } else {
          const previous = item.input.result;
          const updated = await tx.kpiResult.updateMany({ where: { id: previous.id, version: previous.version }, data: { latestBatchRowId: batchRow.id, statusId, resultValue: item.nextValue, inputValues: item.nextInputs ?? Prisma.JsonNull, comment: item.nextComment, revisionNo: { increment: 1 }, version: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
          if (updated.count !== 1) throw new AppError(409, "RESULT_VERSION_CONFLICT", "A result changed while Save Changes was being committed", { monitoringPeriodInputId: item.change.monitoringPeriodInputId });
          const changeType = previous.resultValue !== null && item.nextValue === null ? "CLEAR" : sameDecimal(previous.resultValue, item.nextValue) ? "INPUTS_UPDATED" : "UPDATE";
          await tx.kpiResultRevision.create({ data: { kpiResultId: previous.id, resultEntryBatchRowId: batchRow.id, revisionNo: previous.revisionNo + 1, previousResultValue: previous.resultValue, newResultValue: item.nextValue, previousComment: previous.comment, newComment: item.nextComment, changeType, entrySource: source, changedByUserId: actor } });
        }
      }
      await tx.resultEntryBatch.update({ where: { id: batch.id }, data: { finishedAt: new Date() } });
      await clearCurrentScoring(tx, periodId);
      await tx.monitoringPeriod.update({ where: { id: periodId }, data: { currentScoringResultsVersion: null, currentScoringBaselineVersion: null, validationStatus: period.validationRunAt || period.validationStatus ? "STALE" : null, validationSummary: Prisma.JsonNull, validationRunByUserId: null } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new AppError(409, "RESULT_VERSION_CONFLICT", "Another save changed this period; reload and try again");
      throw error;
    }

    const saved = await findPeriod(periodId);
    if (!saved) throw new AppError(404, "MONITORING_PERIOD_NOT_FOUND", "Monitoring Period was not found");
    return serialize(saved);
  },
};

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { excelImportService } from "../services/excel-import.service.js";
import { monitoringWorkflowService } from "../services/monitoring-workflow.service.js";
import { resultEntryService } from "../services/result-entry.service.js";

const run = process.env.RUN_MONITORING_INTEGRATION === "true" ? describe : describe.skip;
const externalId = 990001n;
let periodId = "";

async function cleanup() {
  const period = await prisma.monitoringPeriod.findUnique({ where: { kpiPoolExternalId_poolInputPeriodExternalId: { kpiPoolExternalId: externalId, poolInputPeriodExternalId: externalId } }, select: { id: true } });
  if (!period) return;
  const inputs = await prisma.monitoringPeriodInput.findMany({ where: { monitoringPeriodId: period.id }, select: { id: true } });
  const ids = inputs.map((input) => input.id);
  const results = await prisma.kpiResult.findMany({ where: { monitoringPeriodInputId: { in: ids } }, select: { id: true } });
  const resultIds = results.map((result) => result.id);
  await prisma.$transaction([
    prisma.monitoringValidationIssue.deleteMany({ where: { monitoringPeriodId: period.id } }),
    prisma.monitoringValidationRun.deleteMany({ where: { monitoringPeriodId: period.id } }),
    prisma.kpiResultRevision.deleteMany({ where: { kpiResultId: { in: resultIds } } }),
    prisma.kpiResult.deleteMany({ where: { id: { in: resultIds } } }),
    prisma.resultEntryBatchRow.deleteMany({ where: { monitoringPeriodInputId: { in: ids } } }),
    prisma.resultEntryBatch.deleteMany({ where: { monitoringPeriodId: period.id } }),
    prisma.monitoringPeriodInput.deleteMany({ where: { monitoringPeriodId: period.id } }),
    prisma.monitoringPeriodScorecard.deleteMany({ where: { monitoringPeriodId: period.id } }),
    prisma.monitoringPeriod.delete({ where: { id: period.id } }),
  ]);
}

run("Result Entry MySQL acceptance", () => {
  beforeAll(async () => {
    await cleanup();
    await Promise.all([
      prisma.monitoringInputMethod.upsert({ where: { code: "MANUAL" }, update: {}, create: { code: "MANUAL", name: "Manual Entry" } }),
      prisma.monitoringInputMethod.upsert({ where: { code: "EXCEL" }, update: {}, create: { code: "EXCEL", name: "Excel Import" } }),
      prisma.resultEntryBatchStatus.upsert({ where: { code: "IMPORTED" }, update: {}, create: { code: "IMPORTED", name: "Imported" } }),
      prisma.resultEntryRowStatus.upsert({ where: { code: "VALID" }, update: {}, create: { code: "VALID", name: "Valid" } }),
      prisma.kpiResultStatus.upsert({ where: { code: "PENDING" }, update: {}, create: { code: "PENDING", name: "Pending" } }),
      prisma.kpiResultStatus.upsert({ where: { code: "ENTERED" }, update: {}, create: { code: "ENTERED", name: "Entered" } }),
    ]);
    const draft = await prisma.monitoringPeriodStatus.findUniqueOrThrow({ where: { code: "DRAFT" } });
    const period = await prisma.monitoringPeriod.create({ data: { kpiPoolExternalId: externalId, poolInputPeriodExternalId: externalId, poolPeriodCompositionExternalId: externalId, poolCodeSnapshot: "OPS-TEST", poolNameSnapshot: "Integration Test", sequenceNo: 1, periodKey: "2099-01", periodStart: new Date("2099-01-01"), periodEnd: new Date("2099-01-31"), periodLabel: "January 2099", statusId: draft.id } });
    periodId = period.id.toString();
    const scorecard = await prisma.monitoringPeriodScorecard.create({ data: { monitoringPeriodId: period.id, scorecardExternalId: externalId, scorecardPeriodCompositionExternalId: externalId, scorecardCodeSnapshot: "SC-TEST", scorecardNameSnapshot: "Test Scorecard" } });
    for (let index = 1; index <= 10; index++) await prisma.monitoringPeriodInput.create({ data: { monitoringPeriodId: period.id, monitoringPeriodScorecardId: scorecard.id, kpiConfigurationExternalId: externalId + BigInt(index), kpiConfigurationRevisionExternalId: externalId + BigInt(index), poolCompositionItemExternalId: externalId + BigInt(index), scorecardKpiAssignmentExternalId: externalId + BigInt(index), configCodeSnapshot: `KPC-T${index}`, kpiCodeSnapshot: `KPI-${index}`, kpiNameSnapshot: `KPI ${index}`, goalValueSnapshot: 100, evaluationTypeCodeSnapshot: "HIGHER_IS_BETTER", resultSemanticsSnapshot:"ABSOLUTE_VALUE",scoringMethodCodeSnapshot: "PROPORTIONAL",scoringRuleConfigSnapshot:{floorPercent:0,capPercent:100},scoringRuleConfigVersionSnapshot:1,negativeResultPolicySnapshot:"DISALLOW",scoringApprovalStatusSnapshot:"APPROVED", weightPercentSnapshot: 10, displayOrder: index, thresholds: { create: [
      { trafficLightCodeSnapshot: "RED", rangeMinPercent: 0, rangeMaxPercent: 65, includesMin: true, includesMax: false, displayOrder: 1 },
      { trafficLightCodeSnapshot: "YELLOW", rangeMinPercent: 65, rangeMaxPercent: 80, includesMin: true, includesMax: false, displayOrder: 2 },
      { trafficLightCodeSnapshot: "GREEN", rangeMinPercent: 80, rangeMaxPercent: null, includesMin: true, includesMax: false, displayOrder: 3 },
    ] } } });
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("shares one persisted Draft across Manual and Excel from 0 to 4 to 7 to 10 entered", async () => {
    const initial = await resultEntryService.get(periodId);
    expect(initial.summary).toEqual({ expected: 10, entered: 0, pending: 10 });
    const [a, b, c, d, e, f, g, h, i, j] = initial.inputs;

    const pendingWithComment = await resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: j.id, resultValue: null, comment: "Pending confirmation", version: null },
    ] }, 11n);
    expect(pendingWithComment.summary).toEqual({ expected: 10, entered: 0, pending: 10 });
    expect(pendingWithComment.inputs[9]).toMatchObject({ resultValue: null, comment: "Pending confirmation", entryStatus: "PENDING" });

    const manualFour = await resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: a.id, resultValue: "80", comment: null, version: null },
      { monitoringPeriodInputId: b.id, resultValue: "0", comment: null, version: null },
      { monitoringPeriodInputId: c.id, resultValue: "95", comment: null, version: null },
      { monitoringPeriodInputId: d.id, resultValue: "50", comment: null, version: null },
    ] }, 11n);
    expect(manualFour.summary).toEqual({ expected: 10, entered: 4, pending: 6 });
    expect(manualFour.inputs[1]).toMatchObject({ resultValue: "0", entryStatus: "ENTERED" });

    const excelSeven = await excelImportService.confirm(periodId, [
      { monitoringPeriodInputId: e.id, resultValue: "20", comment: "Excel E", version: null },
      { monitoringPeriodInputId: f.id, resultValue: "30", comment: null, version: null },
      { monitoringPeriodInputId: g.id, resultValue: "40", comment: null, version: null },
    ], 12n);
    expect(excelSeven.summary).toEqual({ expected: 10, entered: 7, pending: 3 });

    const excelUpdate = await excelImportService.confirm(periodId, [
      { monitoringPeriodInputId: a.id, resultValue: "85", comment: null, version: 1 },
    ], 12n);
    expect(excelUpdate.summary).toEqual({ expected: 10, entered: 7, pending: 3 });
    expect(excelUpdate.inputs[0]).toMatchObject({ resultValue: "85", version: 2 });

    const manualTen = await resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: h.id, resultValue: "10", comment: null, version: null },
      { monitoringPeriodInputId: i.id, resultValue: "15", comment: null, version: null },
      { monitoringPeriodInputId: j.id, resultValue: "0", comment: "Confirmed zero", version: 1 },
    ] }, 11n);
    expect(manualTen.summary).toEqual({ expected: 10, entered: 10, pending: 0 });
    expect(manualTen.inputs[9]).toMatchObject({ resultValue: "0", entryStatus: "ENTERED", version: 2 });

    const refreshed = await resultEntryService.get(periodId);
    expect(refreshed.summary).toEqual({ expected: 10, entered: 10, pending: 0 });
    expect(refreshed.inputs.map((input: { resultValue: string | null }) => input.resultValue)).toEqual(["85", "0", "95", "50", "20", "30", "40", "10", "15", "0"]);

    const currentResults = await prisma.kpiResult.findMany({ where: { input: { monitoringPeriodId: BigInt(periodId) } } });
    expect(currentResults).toHaveLength(10);
    expect(new Set(currentResults.map((result) => result.monitoringPeriodInputId.toString())).size).toBe(10);

    const batches = await prisma.resultEntryBatch.findMany({
      where: { monitoringPeriodId: BigInt(periodId) },
      include: { method: true },
      orderBy: { batchNo: "asc" },
    });
    expect(batches.map((batch) => batch.method.code)).toEqual(["MANUAL", "MANUAL", "EXCEL", "EXCEL", "MANUAL"]);

    const aRevisions = await prisma.kpiResultRevision.findMany({
      where: { result: { monitoringPeriodInputId: BigInt(a.id) } },
      orderBy: { revisionNo: "asc" },
    });
    expect(aRevisions.map((revision) => ({
      previous: revision.previousResultValue?.toString() ?? null,
      next: revision.newResultValue?.toString() ?? null,
      source: revision.entrySource,
    }))).toEqual([
      { previous: null, next: "80", source: "MANUAL" },
      { previous: "80", next: "85", source: "EXCEL" },
    ]);

    const jRevisions = await prisma.kpiResultRevision.findMany({
      where: { result: { monitoringPeriodInputId: BigInt(j.id) } },
      orderBy: { revisionNo: "asc" },
    });
    expect(jRevisions.map((revision) => [revision.previousResultValue?.toString() ?? null, revision.newResultValue?.toString() ?? null, revision.entrySource])).toEqual([
      [null, null, "MANUAL"],
      [null, "0", "MANUAL"],
    ]);

    const batchesBeforeConflict = await prisma.resultEntryBatch.count({ where: { monitoringPeriodId: BigInt(periodId) } });
    await expect(resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: a.id, resultValue: "90", comment: null, version: 1 },
    ] }, 12n)).rejects.toMatchObject({ statusCode: 409, code: "RESULT_VERSION_CONFLICT" });
    expect(await prisma.resultEntryBatch.count({ where: { monitoringPeriodId: BigInt(periodId) } })).toBe(batchesBeforeConflict);
    expect((await resultEntryService.get(periodId)).inputs[0].resultValue).toBe("85");

    const beforeCheck = await resultEntryService.get(periodId);
    const firstCheck = await monitoringWorkflowService.validate(periodId, { version: beforeCheck.monitoringPeriod.version }, 13n);
    expect(firstCheck.monitoringPeriod.validationRun).toMatchObject({ status: "CURRENT", summary: { passed: 10, blocking: 0, critical: 0, missing: 0 } });

    const excelAfterCheck = await excelImportService.confirm(periodId, [
      { monitoringPeriodInputId: a.id, resultValue: "86", comment: null, version: 2 },
    ], 12n);
    expect(excelAfterCheck.monitoringPeriod).toMatchObject({ validationStatus: "STALE", validationRun: { status: "STALE" } });
    await expect(monitoringWorkflowService.submit(periodId, { version: excelAfterCheck.monitoringPeriod.version }, 13n)).rejects.toMatchObject({ code: "VALIDATION_REQUIRED" });

    const secondCheck = await monitoringWorkflowService.validate(periodId, { version: excelAfterCheck.monitoringPeriod.version }, 13n);
    const manualAfterCheck = await resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: b.id, resultValue: "1", comment: null, version: 1 },
    ] }, 11n);
    expect(manualAfterCheck.monitoringPeriod.validationRun).toMatchObject({ status: "STALE" });
    const finalCheck = await monitoringWorkflowService.validate(periodId, { version: manualAfterCheck.monitoringPeriod.version }, 13n);
    const submitted = await monitoringWorkflowService.submit(periodId, { version: finalCheck.monitoringPeriod.version }, 13n);
    expect(submitted.monitoringPeriod.status).toBe("SUBMITTED");
    await expect(resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: a.id, resultValue: "90", comment: null, version: 3 },
    ] }, 11n)).rejects.toMatchObject({ statusCode: 409, code: "MONITORING_PERIOD_NOT_DRAFT" });
  });
});

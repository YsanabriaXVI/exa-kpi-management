import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
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
    const draft = await prisma.monitoringPeriodStatus.findUniqueOrThrow({ where: { code: "DRAFT" } });
    const period = await prisma.monitoringPeriod.create({ data: { kpiPoolExternalId: externalId, poolInputPeriodExternalId: externalId, poolPeriodCompositionExternalId: externalId, poolCodeSnapshot: "OPS-TEST", poolNameSnapshot: "Integration Test", sequenceNo: 1, periodKey: "2099-01", periodStart: new Date("2099-01-01"), periodEnd: new Date("2099-01-31"), periodLabel: "January 2099", statusId: draft.id } });
    periodId = period.id.toString();
    const scorecard = await prisma.monitoringPeriodScorecard.create({ data: { monitoringPeriodId: period.id, scorecardExternalId: externalId, scorecardPeriodCompositionExternalId: externalId, scorecardCodeSnapshot: "SC-TEST", scorecardNameSnapshot: "Test Scorecard" } });
    for (let index = 1; index <= 10; index++) await prisma.monitoringPeriodInput.create({ data: { monitoringPeriodId: period.id, monitoringPeriodScorecardId: scorecard.id, kpiConfigurationExternalId: externalId + BigInt(index), kpiConfigurationRevisionExternalId: externalId + BigInt(index), poolCompositionItemExternalId: externalId + BigInt(index), scorecardKpiAssignmentExternalId: externalId + BigInt(index), configCodeSnapshot: `KPC-T${index}`, kpiCodeSnapshot: `KPI-${index}`, kpiNameSnapshot: `KPI ${index}`, evaluationTypeCodeSnapshot: "HIGHER_IS_BETTER", weightPercentSnapshot: 10, displayOrder: index } });
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("persists partial saves, revisions, clears, comments, refreshes and rolls back stale batches", async () => {
    const initial = await resultEntryService.get(periodId);
    expect(initial.summary).toEqual({ expected: 10, entered: 0, pending: 10 });
    const [a, b, c, d] = initial.inputs;
    const first = await resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: a.id, resultValue: "80", comment: null, version: null },
      { monitoringPeriodInputId: b.id, resultValue: "0", comment: null, version: null },
      { monitoringPeriodInputId: c.id, resultValue: "95", comment: null, version: null },
      { monitoringPeriodInputId: d.id, resultValue: null, comment: "Pending confirmation", version: null },
    ] }, 11n);
    expect(first.summary).toEqual({ expected: 10, entered: 3, pending: 7 });
    expect((await resultEntryService.get(periodId)).inputs[1].resultValue).toBe("0");

    const changed = await resultEntryService.save(periodId, { changes: [{ monitoringPeriodInputId: a.id, resultValue: "85", comment: null, version: 1 }] }, 11n);
    expect(changed.inputs[0]).toMatchObject({ resultValue: "85", version: 2 });
    const commented = await resultEntryService.save(periodId, { changes: [{ monitoringPeriodInputId: b.id, resultValue: "0", comment: "Confirmed zero", version: 1 }] }, 11n);
    expect(commented.inputs[1]).toMatchObject({ resultValue: "0", comment: "Confirmed zero", version: 2 });

    const batchesBeforeConflict = await prisma.resultEntryBatch.count({ where: { monitoringPeriodId: BigInt(periodId) } });
    await expect(resultEntryService.save(periodId, { changes: [
      { monitoringPeriodInputId: a.id, resultValue: "90", comment: null, version: 1 },
      { monitoringPeriodInputId: c.id, resultValue: "22", comment: null, version: 1 },
    ] }, 12n)).rejects.toMatchObject({ statusCode: 409, code: "RESULT_VERSION_CONFLICT" });
    expect(await prisma.resultEntryBatch.count({ where: { monitoringPeriodId: BigInt(periodId) } })).toBe(batchesBeforeConflict);
    expect((await resultEntryService.get(periodId)).inputs[2].resultValue).toBe("95");

    const cleared = await resultEntryService.save(periodId, { changes: [{ monitoringPeriodInputId: a.id, resultValue: null, comment: null, version: 2 }] }, 11n);
    expect(cleared.inputs[0]).toMatchObject({ resultValue: null, entryStatus: "PENDING", version: 3 });
    const revisions = await prisma.kpiResultRevision.findMany({ where: { result: { monitoringPeriodInputId: BigInt(a.id) } }, orderBy: { revisionNo: "asc" } });
    expect(revisions.map((revision) => [revision.previousResultValue?.toString() ?? null, revision.newResultValue?.toString() ?? null, revision.changeType])).toEqual([[null, "80", "CREATE"], ["80", "85", "UPDATE"], ["85", null, "CLEAR"]]);
  });
});

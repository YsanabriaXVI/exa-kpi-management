import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const db = vi.hoisted(() => ({ monitoringPeriodScorecard: { findMany: vi.fn(), findFirst: vi.fn() } }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
import { closedResultsService } from "../services/closed-results.service.js";

function fixture() {
  return {
    id: 1n, scorecardExternalId: 7n, ownKpiWeightPercentSnapshot: new Prisma.Decimal(100), linkedScorecardWeightPercentSnapshot: new Prisma.Decimal(0),
    finalScorePercent: null, directScorePercent: null, linkedScorePercent: new Prisma.Decimal(0), outgoingLinks: [],
    inputs: [{ id: 3n, kpiConfigurationExternalId: 4n, evaluationKindSnapshot: "OVERALL", weightPercentSnapshot: new Prisma.Decimal(100), result: { resultValue: new Prisma.Decimal(0), revisions: [] }, thresholds: [], baselineResolutions: [] }],
    period: { id: 2n, kpiPoolExternalId: 9n, periodStart: new Date("2026-08-01Z"), periodEnd: new Date("2026-08-31Z"), closedWithExceptions: true,
      workflowEvents: [{ id: 5n, toStatusCode: "CLOSED", metadata: { validationRunId: "6" } }],
      validationRuns: [{ id: 6n, scoringSnapshot: { evaluations: [{ id: "3", goal: "12", goalUnit: "%", historical: { baseline: "100" } }] }, issues: [] }, { id: 8n, scoringSnapshot: {}, issues: [] }], closure: null },
  };
}
beforeEach(() => vi.resetAllMocks());
describe("closed results read contract", () => {
  it("reads only closed results and retains decimals, missing scores and the closure's exact Check", async () => {
    db.monitoringPeriodScorecard.findFirst.mockResolvedValue(fixture());
    const result = await closedResultsService.get("1");
    expect(db.monitoringPeriodScorecard.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n, period: { status: { code: "CLOSED" } } } }));
    expect(result).toMatchObject({ score: null, linkedScore: "0", status: "Closed with Exceptions", check: { id: "6" }, evaluations: [{ result: "0", score: null, goal: "12", goalUnit: "%", historical: { baseline: "100" } }] });
  });
  it("does not invent a historical Check when closure metadata lacks one", async () => {
    const card = fixture();
    card.period.workflowEvents = [];
    db.monitoringPeriodScorecard.findFirst.mockResolvedValue(card);
    expect(await closedResultsService.get("1")).toMatchObject({ check: null, evaluations: [{ historical: null }] });
  });
  it("returns not found for an unavailable official result", async () => {
    db.monitoringPeriodScorecard.findFirst.mockResolvedValue(null);
    await expect(closedResultsService.get("1")).rejects.toMatchObject({ statusCode: 404 });
  });
  it("paginates without dropping the extra result and scopes every page to CLOSED", async () => {
    db.monitoringPeriodScorecard.findMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({ ...fixture(), id: BigInt(index + 11) })));
    const result = await closedResultsService.list("10");
    expect(result.items).toHaveLength(50);
    expect(result.nextCursor).toBe("60");
    expect(db.monitoringPeriodScorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { gt: 10n }, period: { status: { code: "CLOSED" } } }, take: 51 }));
  });
});

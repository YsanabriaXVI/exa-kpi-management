import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  monitoringPeriod: { findUnique: vi.fn(), updateMany: vi.fn() },
  monitoringPeriodScorecard: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  monitoringPeriodStatus: { findUnique: vi.fn() },
  monitoringPeriodInput: { count: vi.fn(), findMany: vi.fn() },
  monitoringValidationRun: { findFirst: vi.fn(), updateMany: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
  monitoringValidationIssue: { createMany: vi.fn() },
  monitoringPeriodWorkflowEvent: { create: vi.fn() },
  monitoringPeriodClosure: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
}));
const db = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../services/result-entry.service.js", () => ({ resultEntryService: { get: vi.fn().mockResolvedValue({ monitoringPeriod: { id: "1" } }) } }));
vi.mock("../services/scoring.service.js", () => ({ recalculatePeriodScores: vi.fn() }));
import { monitoringWorkflowService } from "../services/monitoring-workflow.service.js";

beforeEach(() => {
  vi.clearAllMocks();
  tx.monitoringPeriodInput.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
});

describe("Monitoring workflow", () => {
  const justification = "The source has not delivered the missing Result";
  function checked(status: string, issues = [{ findingCode: "RESULT_MISSING", exceptionAllowed: true }]) {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, kpiPoolExternalId: 9n, poolInputPeriodExternalId: 10n, periodKey: "2026-08", version: 4, resultsVersion: 1, currentScoringResultsVersion: 1, validationRunAt: new Date(), validationStatus: "BLOCKED", status: { code: status } });
    tx.monitoringValidationRun.findFirst.mockResolvedValue({ id: 8n, basedOnResultsVersion: 1, status: "CURRENT", issues });
    tx.monitoringPeriodStatus.findUnique.mockResolvedValue({ id: 3n });
    tx.monitoringPeriod.updateMany.mockResolvedValue({ count: 1 });
  }
  it.each(["submit", "approve"] as const)("requires explicit exceptions and records the justification for %s", async action => {
    checked(action === "submit" ? "DRAFT" : "SUBMITTED");
    await expect(monitoringWorkflowService[action]("1", { version: 4 }, 7n)).rejects.toMatchObject({ statusCode: 422 });
    await expect(monitoringWorkflowService[action]("1", { version: 4, withExceptions: true }, 7n)).rejects.toThrow();
    expect(tx.monitoringPeriod.updateMany).not.toHaveBeenCalled();
    await monitoringWorkflowService[action]("1", { version: 4, withExceptions: true, justification }, 7n);
    expect(tx.monitoringPeriodWorkflowEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ comment: justification, metadata: { withExceptions: true, validationRunId: "8", exceptionCodes: ["RESULT_MISSING"] } }) });
  });
  it.each(["submit", "approve", "close"] as const)("never waives scoring errors at %s", async action => {
    checked(action === "submit" ? "DRAFT" : action === "approve" ? "SUBMITTED" : "VALIDATED", [{ findingCode: "RESULT_MISSING", exceptionAllowed: true }, { findingCode: "SCORING_METHOD_NOT_CONFIGURED", exceptionAllowed: true }]);
    tx.monitoringPeriodInput.count.mockResolvedValue(1);
    await expect(monitoringWorkflowService[action]("1", { version: 4, withExceptions: true, justification }, 7n)).rejects.toMatchObject({ statusCode: 422 });
    expect(tx.monitoringPeriod.updateMany).not.toHaveBeenCalled();
  });
  it("closes with documented missing Results while preserving unavailable final scores", async () => {
    checked("VALIDATED");
    tx.monitoringPeriodInput.count.mockResolvedValue(1);
    tx.monitoringPeriodScorecard.findMany.mockResolvedValue([{ id: 9n, previewScorePercent: null }]);
    await monitoringWorkflowService.close("1", { version: 4, withExceptions: true, justification }, 7n);
    expect(tx.monitoringPeriodScorecard.update).toHaveBeenCalledWith({ where: { id: 9n }, data: { finalScorePercent: null } });
    expect(tx.monitoringPeriodClosure.create).toHaveBeenCalledWith({ data: expect.objectContaining({ closureType: "WITH_EXCEPTIONS", missingResultCount: 1, justification }) });
  });
  it("rejects a Check based on older Results even if its stored status says CURRENT", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({id:1n,version:4,resultsVersion:5,currentScoringResultsVersion:5,validationRunAt:new Date(),validationStatus:"PASSED",status:{code:"DRAFT"}});
    tx.monitoringValidationRun.findFirst.mockResolvedValue({id:8n,basedOnResultsVersion:4,status:"CURRENT",issues:[]});
    await expect(monitoringWorkflowService.submit("1",{version:4},7n)).rejects.toMatchObject({code:"VALIDATION_REQUIRED"});
    expect(tx.monitoringPeriod.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the Results and Check versions unchanged when returning for correction", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({id:1n,version:9,resultsVersion:4,currentScoringResultsVersion:4,status:{code:"SUBMITTED"}});
    tx.monitoringPeriodStatus.findUnique.mockResolvedValue({id:1n,code:"DRAFT"});
    tx.monitoringPeriod.updateMany.mockResolvedValue({count:1});
    await monitoringWorkflowService.returnForCorrection("1",{version:9,reason:"Please review these Results"},7n);
    const data=tx.monitoringPeriod.updateMany.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("resultsVersion");
    expect(data).not.toHaveProperty("currentScoringResultsVersion");
    expect(tx.monitoringValidationRun.updateMany).not.toHaveBeenCalled();
  });
  it("requires persisted validation before Submit", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, version: 1, validationRunAt: null, validationStatus: null, status: { code: "DRAFT" } });
    await expect(monitoringWorkflowService.submit("1", { version: 1 }, 7n)).rejects.toMatchObject({ code: "VALIDATION_REQUIRED" });
    expect(tx.monitoringPeriod.updateMany).not.toHaveBeenCalled();
  });

  it("transitions validated Draft results to Submitted with optimistic locking and audit", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, kpiPoolExternalId:9n,poolInputPeriodExternalId:10n,periodKey:"2026-08",version: 3, resultsVersion: 1, currentScoringResultsVersion: 1, validationRunAt: new Date(), validationStatus: "PASSED", status: { code: "DRAFT" } });
    tx.monitoringValidationRun.findFirst.mockResolvedValue({ id: 8n, basedOnResultsVersion: 1, status: "CURRENT", issues: [] });
    tx.monitoringPeriodStatus.findUnique.mockResolvedValue({ id: 2n, code: "SUBMITTED" });
    tx.monitoringPeriod.updateMany.mockResolvedValue({ count: 1 });
    await monitoringWorkflowService.submit("1", { version: 3 }, 7n);
    expect(tx.monitoringPeriod.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n, version: 3 }, data: expect.objectContaining({ statusId: 2n, version: { increment: 1 } }) }));
    expect(tx.monitoringPeriodWorkflowEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actionCode: "SUBMIT", fromStatusCode: "DRAFT", toStatusCode: "SUBMITTED" }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({eventType:"monitoring.period.submitted.v1",aggregateVersion:4,subject:"monitoring.period.submitted.v1"})});
  });

  it("blocks normal Close while results are missing", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, version: 4, status: { code: "VALIDATED" } });
    tx.monitoringPeriodInput.count.mockResolvedValue(1);
    await expect(monitoringWorkflowService.close("1", { version: 4, withExceptions: false, justification: null }, 7n)).rejects.toMatchObject({ code: "MISSING_RESULTS_BLOCK_CLOSE" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  monitoringPeriod: { findUnique: vi.fn(), updateMany: vi.fn() },
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
  db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
});

describe("Monitoring workflow", () => {
  it("persists a KPI-level critical finding when business scoring remains BLOCKED", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, version: 1, status: { code: "DRAFT" } });
    tx.monitoringPeriodInput.findMany.mockResolvedValue([{ id: 10n, kpiConfigurationExternalId: 20n, kpiCodeSnapshot: "KPI-BLOCKED", isRequired: true, result: { resultValue: 1, calculationStatus: "NOT_CALCULABLE", calculationErrorCode: "SCORING_CONFIGURATION_NOT_APPROVED", calculationVersion: "SCORING_V1" } }]);
    tx.monitoringValidationRun.updateMany.mockResolvedValue({ count: 0 });
    tx.monitoringValidationRun.aggregate.mockResolvedValue({ _max: { runNo: null } });
    tx.monitoringValidationRun.create.mockResolvedValue({ id: 30n });
    tx.monitoringValidationIssue.createMany.mockResolvedValue({ count: 1 });
    tx.monitoringPeriod.updateMany.mockResolvedValue({ count: 1 });
    await monitoringWorkflowService.validate("1", { version: 1 }, 7n);
    expect(tx.monitoringValidationIssue.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ monitoringPeriodInputId: 10n, findingCode: "SCORING_CONFIGURATION_NOT_APPROVED", severity: "CRITICAL", blocksSubmit: true, blocksApproval: true })] });
    expect(tx.monitoringPeriod.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ validationStatus: "BLOCKED" }) }));
  });

  it("requires persisted validation before Submit", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, version: 1, validationRunAt: null, validationStatus: null, status: { code: "DRAFT" } });
    await expect(monitoringWorkflowService.submit("1", { version: 1 }, 7n)).rejects.toMatchObject({ code: "VALIDATION_REQUIRED" });
    expect(tx.monitoringPeriod.updateMany).not.toHaveBeenCalled();
  });

  it("transitions validated Draft results to Submitted with optimistic locking and audit", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, kpiPoolExternalId:9n,poolInputPeriodExternalId:10n,periodKey:"2026-08",version: 3, validationRunAt: new Date(), validationStatus: "PASSED", status: { code: "DRAFT" } });
    tx.monitoringValidationRun.findFirst.mockResolvedValue({ id: 8n, status: "CURRENT", issues: [] });
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

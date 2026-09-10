import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), periods: vi.fn(), resolve: vi.fn(), materialization: vi.fn(), materialize: vi.fn() }));
vi.mock("../clients/scorecards.client.js", () => ({ scorecardsClient: { materialization: mocks.materialization } }));
vi.mock("../services/monitoring-period.service.js", () => ({ monitoringPeriodService: { materialize: mocks.materialize } }));
vi.mock("../config/prisma.js", () => ({ prisma: { monitoringPeriod: { findUnique: mocks.findUnique } } }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: { periods: mocks.periods } }));
vi.mock("../services/monitoring-read.service.js", () => ({ monitoringReadService: { resolve: mocks.resolve } }));
import { nextPeriodService } from "../services/next-period.service.js";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.materialization.mockResolvedValue({ readiness: "READY", scorecards: [] });
  mocks.findUnique.mockResolvedValue({ status: { code: "CLOSED" }, kpiPoolExternalId: 9n, periodEnd: new Date("2026-09-30T00:00:00Z") });
});
describe("Next Period", () => {
  it("requires a closed source", async () => {
    mocks.findUnique.mockResolvedValue({ status: { code: "DRAFT" } });
    await expect(nextPeriodService.resolve("1")).rejects.toMatchObject({ code: "NEXT_PERIOD_REQUIRES_CLOSED" });
    expect(mocks.periods).not.toHaveBeenCalled();
  });
  it("selects chronological successor without skipping an unconfigured period", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-11-01", poolPeriodId: "3" }, { start: "2026-10-01", poolPeriodId: null }]);
    expect(await nextPeriodService.resolve("1")).toMatchObject({ stage: "POOL_EDITABLE", inputPeriod: { start: "2026-10-01" } });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("reuses authoritative readiness and existing Monitoring identity", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-10-01", poolPeriodId: "2", workflowStatus: "FINALIZED" }]);
    mocks.resolve.mockResolvedValue({ availability: "AVAILABLE", monitoringPeriod: { id: "8" } });
    expect(await nextPeriodService.resolve("1")).toMatchObject({ availability: "AVAILABLE", monitoringPeriod: { id: "8" }, poolId: "9" });
    expect(mocks.resolve).toHaveBeenCalledWith("9", "2");
  });
  it("reports the end of the Pool calendar", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-09-01", poolPeriodId: "1" }]);
    expect(await nextPeriodService.resolve("1")).toMatchObject({ stage: "END_OF_SCHEDULE" });
  });
  it("cannot initialize before Pool finalization", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-10-01", poolPeriodId: "2", workflowStatus: "PREPARING" }]);
    await expect(nextPeriodService.initialize("1", 7n)).rejects.toMatchObject({ code: "NEXT_PERIOD_REVIEW_REQUIRED" });
    expect(mocks.materialize).not.toHaveBeenCalled();
  });
  it("cannot initialize until every Scorecard is ready", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-10-01", poolPeriodId: "2", workflowStatus: "FINALIZED" }]);
    mocks.resolve.mockResolvedValue({ monitoringPeriod: null });
    mocks.materialization.mockResolvedValue({ readiness: "NOT_READY", scorecards: [] });
    await expect(nextPeriodService.initialize("1", 7n)).rejects.toMatchObject({ code: "NEXT_PERIOD_REVIEW_REQUIRED" });
    expect(mocks.materialize).not.toHaveBeenCalled();
  });
  it("materializes the exact successor only when ready", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-10-01", poolPeriodId: "2", workflowStatus: "FINALIZED" }]);
    mocks.resolve.mockResolvedValue({ monitoringPeriod: null });
    mocks.materialize.mockResolvedValue({ created: true, data: { id: "8" } });
    expect(await nextPeriodService.initialize("1", 7n)).toMatchObject({ created: true, data: { id: "8" } });
    expect(mocks.materialize).toHaveBeenCalledWith({ poolId: "9", poolInputPeriodId: "2" }, 7n);
  });
});

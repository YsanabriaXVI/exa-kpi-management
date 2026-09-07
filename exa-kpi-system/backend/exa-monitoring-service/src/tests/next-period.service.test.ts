import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), periods: vi.fn(), resolve: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: { monitoringPeriod: { findUnique: mocks.findUnique } } }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: { periods: mocks.periods } }));
vi.mock("../services/monitoring-read.service.js", () => ({ monitoringReadService: { resolve: mocks.resolve } }));
import { nextPeriodService } from "../services/next-period.service.js";
beforeEach(() => {
  vi.resetAllMocks();
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
    expect(await nextPeriodService.resolve("1")).toMatchObject({ availability: "NOT_AVAILABLE", inputPeriod: { start: "2026-10-01" } });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("reuses authoritative readiness and existing Monitoring identity", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-10-01", poolPeriodId: "2" }]);
    mocks.resolve.mockResolvedValue({ availability: "AVAILABLE", monitoringPeriod: { id: "8" } });
    expect(await nextPeriodService.resolve("1")).toMatchObject({ availability: "AVAILABLE", monitoringPeriod: { id: "8" }, poolId: "9" });
    expect(mocks.resolve).toHaveBeenCalledWith("9", "2");
  });
  it("reports the end of the Pool calendar", async () => {
    mocks.periods.mockResolvedValue([{ start: "2026-09-01", poolPeriodId: "1" }]);
    expect(await nextPeriodService.resolve("1")).toMatchObject({ availability: "END_OF_SCHEDULE" });
  });
});

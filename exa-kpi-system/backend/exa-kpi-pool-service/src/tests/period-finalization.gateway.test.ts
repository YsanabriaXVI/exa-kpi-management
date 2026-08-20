import { describe, expect, it } from "vitest";
import { periodFinalizationGateway, type MonitoringPeriodStatusProvider } from "../gateways/period-finalization.gateway.js";
import { poolPeriods } from "../domain/input-period.js";

const periods = poolPeriods(new Date("2026-08-01T00:00:00.000Z"), new Date("2026-12-31T00:00:00.000Z"), 1);

describe("period finalization dependency", () => {
  it("allows the first Pool period without a previous Monitoring period", async () => {
    await expect(periodFinalizationGateway.evaluate(1n, periods, 0)).resolves.toMatchObject({ canFinalize: true, previousMonitoringStatus: "NOT_REQUIRED" });
  });

  it("does not infer closure when Monitoring is unavailable", async () => {
    await expect(periodFinalizationGateway.evaluate(1n, periods, 1)).resolves.toMatchObject({ canFinalize: false, previousPeriodStart: "2026-08-01", reasonCode: "MONITORING_INTEGRATION_PENDING" });
  });

  it.each(["CLOSED", "CLOSED_WITH_APPROVED_EXCEPTION"] as const)("allows the next period when Monitoring reports %s", async (status) => {
    const provider: MonitoringPeriodStatusProvider = { async getStatus() { return status; } };
    await expect(periodFinalizationGateway.evaluate(1n, periods, 1, provider)).resolves.toMatchObject({ canFinalize: true, previousMonitoringStatus: status });
  });
});

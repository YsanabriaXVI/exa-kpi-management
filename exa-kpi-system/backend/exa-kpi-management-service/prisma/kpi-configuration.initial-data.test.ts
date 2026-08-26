import { describe, expect, it } from "vitest";
import { initialKpiConfigurations } from "./kpi-configuration.initial-data.js";
import { INITIAL_KPI_REVISION_EFFECTIVE_FROM } from "./import-kpi-configuration-mocks.js";

describe("KPI Configuration initial Traffic Light data", () => {
  it("starts revisions before the first 2026 operational Input Period", () => {
    expect(INITIAL_KPI_REVISION_EFFECTIVE_FROM.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
  it("does not persist synthetic PENDING configurations", () => {
    expect(initialKpiConfigurations.some((configuration) => configuration.configCode === "PENDING")).toBe(false);
  });

  it.each([
    { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
    { redFrom: 0, redTo: 30, yellowFrom: 31, yellowTo: 65, greenFrom: 66, greenTo: 100 },
  ])("accepts official score order %#", (ranges) => {
    expect([ranges.redFrom, ranges.yellowFrom, ranges.greenFrom]).toEqual([...new Set([ranges.redFrom, ranges.yellowFrom, ranges.greenFrom])].sort((a, b) => a - b));
  });

  it("never generates Green-low / Red-high ranges", () => {
    for (const item of initialKpiConfigurations.filter((configuration) => configuration.status === "CONFIGURED")) {
      expect(item.ranges.redFrom).toBe(0);
      expect(item.ranges.yellowFrom).toBe(item.ranges.redTo + 1);
      expect(item.ranges.greenFrom).toBe(item.ranges.yellowTo + 1);
      expect(item.ranges.greenTo).toBe(100);
    }
  });
});

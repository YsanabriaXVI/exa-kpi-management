import { describe, expect, it } from "vitest";
import { toKpiConfigurationDto } from "../utils/kpi-configuration.dto.js";

const threshold = (code: string, min: number, max: number) => ({ rangeMinPercent: min, rangeMaxPercent: max, trafficLightLevel: { code } });

describe("KPI Configuration Traffic Light DTO", () => {
  it("maps out-of-order threshold rows by semantic color code", () => {
    const record = {
      id: 1n, configCode: "KPC-052-01", createdAt: new Date("2026-01-01"), updatedAt: null,
      definition: { id: 52n, kpiCode: "KPI-052", kpiName: "Transportation damages" },
      measurementUnit: { symbol: "%" }, primaryDataSource: { code: "EMS", name: "EMS" }, status: { code: "CONFIGURED" },
      revisions: [{ targetValue: 0, evaluationType: { name: "Lower is better" }, thresholds: [threshold("GREEN", 80, 100), threshold("RED", 0, 64), threshold("YELLOW", 65, 79)] }],
    };
    expect(toKpiConfigurationDto(record).ranges).toEqual({ redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 });
  });
});

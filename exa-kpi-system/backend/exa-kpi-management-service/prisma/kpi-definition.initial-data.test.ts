import { describe, expect, it } from "vitest";
import { initialKpiCategories, initialKpiDefinitions } from "./data/kpi-definition.initial-data.js";

describe("KPI Definition initial data", () => {
  it("contains 51 unique valid business codes", () => {
    const codes = initialKpiDefinitions.map((item) => item.kpiCode);
    expect(initialKpiDefinitions).toHaveLength(51);
    expect(new Set(codes).size).toBe(51);
    expect(codes.every((code) => code.length <= 30 && /^KPI-\d{3}$/.test(code))).toBe(true);
  });

  it("resolves every definition to a normalized category", () => {
    const categoryCodes = new Set(initialKpiCategories.map((item) => item.code));
    expect(initialKpiDefinitions.every((item) => categoryCodes.has(item.categoryCode))).toBe(true);
  });

  it("contains no empty or invalid Definition fields", () => {
    expect(initialKpiDefinitions.every((item) =>
      item.kpiName.trim() && item.kpiName.length <= 200 && item.description.trim() && ["ACTIVE", "INACTIVE"].includes(item.status),
    )).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  kpiDefinition: { findFirst: vi.fn() },
  measurementUnit: { findFirst: vi.fn() },
  dataSource: { findFirst: vi.fn() },
  inputFrequency: { findUnique: vi.fn() },
  kpiConfigurationStatus: { findUnique: vi.fn() },
  evaluationType: { findUnique: vi.fn() },
  trafficLightLevel: { findMany: vi.fn() },
  kpiConfiguration: { findMany: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
  kpiConfigurationRevision: { create: vi.fn() },
  kpiConfigurationRevisionThreshold: { createMany: vi.fn() },
}));
const db = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("../config/database/prisma.js", () => ({ prisma: db }));

import { kpiConfigurationService } from "../services/kpi-configuration.service.js";

const input = {
  definitionId: "4", goal: 4200, measurementUnit: "kms", dataSource: "Integrator - EMS", isActive: true,
  ranges: { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((callback) => callback(tx));
  tx.kpiDefinition.findFirst.mockResolvedValue({ id: 4n, kpiCode: "KPI-050", kpiName: "Productivity kms/head" });
  tx.measurementUnit.findFirst.mockResolvedValue({ id: 1n, symbol: "kms" });
  tx.dataSource.findFirst.mockResolvedValue({ id: 2n, code: "INTEGRATOR_EMS", name: "Integrator - EMS" });
  tx.inputFrequency.findUnique.mockResolvedValue({ id: 3n, name: "Monthly" });
  tx.kpiConfigurationStatus.findUnique.mockResolvedValue({ id: 4n, code: "CONFIGURED" });
  tx.evaluationType.findUnique.mockResolvedValue({ id: 5n, name: "Higher is better" });
  tx.trafficLightLevel.findMany.mockResolvedValue([{ id: 6n, code: "RED" }, { id: 7n, code: "YELLOW" }, { id: 8n, code: "GREEN" }]);
  tx.kpiConfiguration.findMany.mockResolvedValue([{ configCode: "KPC-050-01" }, { configCode: "KPC-050-03" }]);
  tx.kpiConfiguration.create.mockResolvedValue({ id: 20n });
  tx.kpiConfigurationRevision.create.mockResolvedValue({ id: 30n });
  tx.kpiConfiguration.findUniqueOrThrow.mockResolvedValue({
    id: 20n, configCode: "KPC-050-04", createdAt: new Date("2026-08-19"), updatedAt: null,
    definition: { id: 4n, kpiCode: "KPI-050", kpiName: "Productivity kms/head" }, measurementUnit: { symbol: "kms" },
    primaryDataSource: { code: "INTEGRATOR_EMS", name: "Integrator - EMS" }, status: { code: "CONFIGURED" }, inputFrequency: { name: "Monthly" },
    revisions: [{ targetValue: 4200, evaluationType: { name: "Higher is better" }, thresholds: [] }],
  });
});

describe("kpiConfigurationService.create", () => {
  it("atomically preserves the real FK and creates configuration, initial revision and three thresholds", async () => {
    const created = await kpiConfigurationService.create(input, 99n);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kpiConfiguration.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kpiDefinitionId: 4n, configCode: "KPC-050-04" }) });
    expect(tx.kpiConfigurationRevision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kpiConfigurationId: 20n, revisionNumber: 1, targetValue: 4200 }) });
    expect(tx.kpiConfigurationRevisionThreshold.createMany.mock.calls[0]?.[0].data).toHaveLength(3);
    expect(created).toMatchObject({ code: "KPC-050-04", definitionId: 4 });
  });
});

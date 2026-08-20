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
const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  kpiConfiguration: { findMany: vi.fn() },
  kpiDefinition: { findMany: vi.fn() },
}));
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

describe("kpiConfigurationService.list", () => {
  it("projects active definitions without configurations as INCOMPLETE without creating PENDING records", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([]);
    db.kpiDefinition.findMany.mockResolvedValue([{
      id: 51n,
      kpiCode: "KPI-051",
      kpiName: "Fuel performance",
      createdAt: new Date("2026-07-28"),
      updatedAt: null,
    }]);

    const result = await kpiConfigurationService.list({ page: 1, pageSize: 100 });

    expect(db.kpiDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        statusCode: "ACTIVE",
        configurations: { none: { deletedAt: null } },
      }),
    }));
    expect(result.data).toEqual([expect.objectContaining({
      id: -51,
      code: "",
      definitionId: 51,
      definitionCode: "KPI-051",
      status: "INCOMPLETE",
    })]);
  });
});

describe("kpiConfigurationService.batchLookup", () => {
  it("loads the complete batch once and preserves requested order while reporting missing IDs", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([
      {
        id: 15n, configCode: "KPC-052-01", kpiDefinitionId: 52n, inputFrequencyId: 1n,
        status: { code: "CONFIGURED" },
        definition: { kpiCode: "KPI-052", kpiName: "Transport damage", isActive: true, statusCode: "ACTIVE", deletedAt: null },
        inputFrequency: { code: "MONTHLY", name: "Monthly", isActive: true },
      },
      {
        id: 10n, configCode: "KPC-050-01", kpiDefinitionId: 50n, inputFrequencyId: 1n,
        status: { code: "INACTIVE" },
        definition: { kpiCode: "KPI-050", kpiName: "Productivity", isActive: true, statusCode: "ACTIVE", deletedAt: null },
        inputFrequency: { code: "MONTHLY", name: "Monthly", isActive: true },
      },
    ]);

    const result = await kpiConfigurationService.batchLookup({ ids: ["10", "15", "22"] });

    expect(db.kpiConfiguration.findMany).toHaveBeenCalledTimes(1);
    expect(db.kpiConfiguration.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [10n, 15n, 22n] }, deletedAt: null },
    }));
    expect(result.data.map((item) => item.id)).toEqual(["10", "15"]);
    expect(result.data[0]).toMatchObject({ definitionId: "50", inputFrequencyId: "1", status: "INACTIVE", isActive: false });
    expect(result.notFoundIds).toEqual(["22"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  kpiPool: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  inputFrequencyReference: { findUnique: vi.fn(), findMany: vi.fn() },
  kpiPoolPeriodComposition: { findUnique: vi.fn(), create: vi.fn() },
  kpiPoolInputPeriod: { findUnique: vi.fn() },
  kpiPoolKpi: { findMany: vi.fn() },
  outboxEvent: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
const management = vi.hoisted(() => ({ batchLookup: vi.fn(), listConfigurations: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-management.client.js", () => ({ kpiManagementClient: management }));
import { kpiPoolMembershipService, lifecycleAllowsPeriodFinalization } from "../services/kpi-pool-membership.service.js";

const pool = { id: 2n, statusCode: "DRAFT", inputFrequencyExternalId: 1n, validFrom: new Date("2026-01-01T00:00:00.000Z"), validTo: new Date("2026-12-31T00:00:00.000Z"), aggregateVersion: 1 };
const configuration = { id: "10", configCode: "KPC-050-01", definitionId: "50", definitionCode: "KPI-050", definitionName: "Productivity", definitionIsActive: true, inputFrequencyId: "1", inputFrequencyCode: "MONTHLY", inputFrequencyName: "Monthly", inputFrequencyIsActive: true, status: "CONFIGURED", isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  db.kpiPool.findFirst.mockResolvedValue(pool);
  db.inputFrequencyReference.findUnique.mockResolvedValue({ monthsPerPeriod: 1 });
  db.kpiPoolPeriodComposition.findUnique.mockResolvedValue(null);
  db.kpiPoolInputPeriod.findUnique.mockResolvedValue({ id: 100n, periodKey: "2026-01" });
  db.kpiPoolPeriodComposition.create.mockResolvedValue({ id: 200n });
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => unknown) => callback(db));
});

describe("KPI Pool membership validation", () => {
  it("allows a DRAFT Pool to finalize only its first Input Period", () => {
    expect(lifecycleAllowsPeriodFinalization("DRAFT", 0)).toBe(true);
    expect(lifecycleAllowsPeriodFinalization("DRAFT", 1)).toBe(false);
  });

  it("allows an ACTIVE Pool to finalize a dependency-approved period", () => {
    expect(lifecycleAllowsPeriodFinalization("ACTIVE", 1)).toBe(true);
    expect(lifecycleAllowsPeriodFinalization("INACTIVE", 0)).toBe(false);
  });

  it("finalizes the first composition and activates its DRAFT Pool atomically", async () => {
    db.kpiPoolKpi.findMany.mockResolvedValue([{ id: 300n, kpiDefinitionExternalId: 50n, kpiConfigurationExternalId: 10n, definitionCodeSnapshot: "KPI-050", definitionNameSnapshot: "Productivity", configurationCodeSnapshot: "KPC-050-01", displayOrder: 1 }]);
    management.batchLookup.mockResolvedValue({ data: [configuration], notFoundIds: [] });

    await expect(kpiPoolMembershipService.finalizePeriod(2n, "2026-01-01", 1n)).resolves.toMatchObject({
      poolStatus: "ACTIVE", status: "POOL_COMPOSITION_LOCKED", kpiCount: 1,
    });
    expect(db.kpiPoolPeriodComposition.create).toHaveBeenCalledOnce();
    expect(db.kpiPool.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ statusCode: "ACTIVE" }) }));
    expect(db.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(db.outboxEvent.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ payload: expect.objectContaining({ data: expect.objectContaining({ poolPeriodId: "100", poolCompositionId: "200", memberships: [expect.objectContaining({ poolMembershipId: "300", kpiConfigurationId: "10" })] }) }) }) });
  });

  it("rejects an empty first composition without activating the Pool", async () => {
    db.kpiPoolKpi.findMany.mockResolvedValue([]);
    await expect(kpiPoolMembershipService.finalizePeriod(2n, "2026-01-01", 1n)).rejects.toMatchObject({ code: "POOL_PERIOD_COMPOSITION_EMPTY" });
    expect(db.kpiPool.update).not.toHaveBeenCalled();
  });
  it("rejects a missing ID and never starts the write transaction", async () => {
    management.batchLookup.mockResolvedValue({ data: [configuration], notFoundIds: ["999"] });
    await expect(kpiPoolMembershipService.add(2n, { configurationIds: ["10", "999"] }, 1n)).rejects.toMatchObject({ code: "KPI_CONFIGURATION_NOT_FOUND" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a frequency mismatch and never writes", async () => {
    management.batchLookup.mockResolvedValue({ data: [{ ...configuration, inputFrequencyId: "2" }], notFoundIds: [] });
    await expect(kpiPoolMembershipService.add(2n, { configurationIds: ["10"] }, 1n)).rejects.toMatchObject({ code: "FREQUENCY_MISMATCH" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects two configurations from one Definition as one failed batch", async () => {
    management.batchLookup.mockResolvedValue({ data: [configuration, { ...configuration, id: "11", configCode: "KPC-050-02" }], notFoundIds: [] });
    await expect(kpiPoolMembershipService.add(2n, { configurationIds: ["10", "11"] }, 1n)).rejects.toMatchObject({ code: "KPI_DEFINITION_ALREADY_EFFECTIVE" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lists an editable Pool as eligible for a matching active Configuration", async () => {
    management.batchLookup.mockResolvedValue({ data: [configuration], notFoundIds: [] });
    db.kpiPool.findMany.mockResolvedValue([{ ...pool, poolCode: "POOL-001", poolName: "Operations", inputFrequencyCode: "MONTHLY", companies: [{ displayOrder: 1, companyNameSnapshot: "EXA" }] }]);
    db.inputFrequencyReference.findMany.mockResolvedValue([{ externalInputFrequencyId: 1n, monthsPerPeriod: 1, isActive: true }]);
    db.kpiPoolKpi.findMany.mockResolvedValue([]);

    await expect(kpiPoolMembershipService.assignmentEligibility(["10"])).resolves.toEqual({ data: [expect.objectContaining({
      poolId: "2", eligibility: "ELIGIBLE", availableConfigurationIds: ["10"], alreadyIncludedConfigurationIds: [], issues: [],
    })] });
  });

  it("blocks a Pool when the KPI Definition already has another effective Configuration", async () => {
    management.batchLookup.mockResolvedValue({ data: [configuration], notFoundIds: [] });
    db.kpiPool.findMany.mockResolvedValue([{ ...pool, poolCode: "POOL-001", poolName: "Operations", inputFrequencyCode: "MONTHLY", companies: [] }]);
    db.inputFrequencyReference.findMany.mockResolvedValue([{ externalInputFrequencyId: 1n, monthsPerPeriod: 1, isActive: true }]);
    db.kpiPoolKpi.findMany.mockResolvedValue([{ kpiDefinitionExternalId: 50n, kpiConfigurationExternalId: 11n, configurationCodeSnapshot: "KPC-050-02" }]);

    const result = await kpiPoolMembershipService.assignmentEligibility(["10"]);
    expect(result.data[0]).toMatchObject({ eligibility: "NOT_ELIGIBLE", issues: [expect.objectContaining({ code: "KPI_DEFINITION_ALREADY_EFFECTIVE", conflictingConfigurationCode: "KPC-050-02" })] });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ kpiPool: { findFirst: vi.fn() }, inputFrequencyReference: { findUnique: vi.fn() }, kpiPoolPeriodComposition: { findUnique: vi.fn() }, $transaction: vi.fn() }));
const management = vi.hoisted(() => ({ batchLookup: vi.fn(), listConfigurations: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-management.client.js", () => ({ kpiManagementClient: management }));
import { kpiPoolMembershipService } from "../services/kpi-pool-membership.service.js";

const pool = { id: 2n, statusCode: "DRAFT", inputFrequencyExternalId: 1n, validFrom: new Date("2026-01-01T00:00:00.000Z"), validTo: new Date("2026-12-31T00:00:00.000Z"), aggregateVersion: 1 };
const configuration = { id: "10", configCode: "KPC-050-01", definitionId: "50", definitionCode: "KPI-050", definitionName: "Productivity", definitionIsActive: true, inputFrequencyId: "1", inputFrequencyCode: "MONTHLY", inputFrequencyName: "Monthly", inputFrequencyIsActive: true, status: "CONFIGURED", isActive: true };

beforeEach(() => { vi.clearAllMocks(); db.kpiPool.findFirst.mockResolvedValue(pool); db.inputFrequencyReference.findUnique.mockResolvedValue({ monthsPerPeriod: 1 }); db.kpiPoolPeriodComposition.findUnique.mockResolvedValue(null); });

describe("KPI Pool membership validation", () => {
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
});

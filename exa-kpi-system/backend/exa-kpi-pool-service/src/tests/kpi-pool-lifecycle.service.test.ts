import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  kpiPool: { findFirst: vi.fn() }, inputFrequencyReference: { findFirst: vi.fn() }, $transaction: vi.fn(),
}));
const tx = vi.hoisted(() => ({ kpiPool: { updateMany: vi.fn() }, outboxEvent: { create: vi.fn() } }));
const management = vi.hoisted(() => ({ batchLookup: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-management.client.js", () => ({ kpiManagementClient: management }));

import { kpiPoolLifecycleService } from "../services/kpi-pool-lifecycle.service.js";

const pool = {
  id: 17n, poolCode: "OPS-01-2026", statusCode: "DRAFT", aggregateVersion: 1,
  inputFrequencyExternalId: 1n, validFrom: new Date("2026-01-01"), validTo: new Date("2026-12-31"),
  areas: [{}], companies: [{}], kpis: [{ kpiConfigurationExternalId: 10n, kpiDefinitionExternalId: 50n, effectiveFrom: new Date("2026-01-01"), effectiveTo: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.kpiPool.findFirst.mockResolvedValue(pool);
  db.inputFrequencyReference.findFirst.mockResolvedValue({ id: 1n });
  management.batchLookup.mockResolvedValue({ data: [{ id: "10", isActive: true, definitionIsActive: true, inputFrequencyIsActive: true, inputFrequencyId: "1" }], notFoundIds: [] });
  db.$transaction.mockImplementation((callback) => callback(tx));
  tx.kpiPool.updateMany.mockResolvedValue({ count: 1 });
  tx.outboxEvent.create.mockResolvedValue({});
});

describe("KPI Pool lifecycle", () => {
  it("activates state and writes the domain event in one transaction", async () => {
    const result = await kpiPoolLifecycleService.activate(17n, 9n);
    expect(tx.kpiPool.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ statusCode: "DRAFT" }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "kpi.pool.activated.v1", subject: "kpi.pool.activated.v1" }) });
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects activation without memberships before opening a transaction", async () => {
    db.kpiPool.findFirst.mockResolvedValue({ ...pool, kpis: [] });
    await expect(kpiPoolLifecycleService.activate(17n, 9n)).rejects.toMatchObject({ code: "KPI_POOL_NOT_READY" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("deactivates ACTIVE and writes its event atomically", async () => {
    db.kpiPool.findFirst.mockResolvedValue({ ...pool, statusCode: "ACTIVE" });
    const result = await kpiPoolLifecycleService.deactivate(17n, 9n);
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "kpi.pool.deactivated.v1" }) });
    expect(result.status).toBe("INACTIVE");
  });
});

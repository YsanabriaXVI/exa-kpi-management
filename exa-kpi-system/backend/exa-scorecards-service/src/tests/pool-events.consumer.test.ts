import { beforeEach, describe, expect, it, vi } from "vitest";
const tx = vi.hoisted(() => ({ poolReference: { upsert: vi.fn() }, poolPeriodReference: { upsert: vi.fn() }, poolPeriodMembershipReference: { deleteMany: vi.fn(), createMany: vi.fn() }, processedEvent: { findUnique: vi.fn(), create: vi.fn() } }));
const db = vi.hoisted(() => ({ processedEvent: { findUnique: vi.fn() }, $transaction: vi.fn() }));
const poolClient = vi.hoisted(() => ({ getPool: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: poolClient }));
import { processPoolEvent } from "../consumers/pool-events.consumer.js";

const event = { eventId: "00000000-0000-4000-8000-000000000001", eventType: "kpi.pool.period.composition.finalized.v1", occurredAt: "2026-08-21T12:00:00.000Z", producer: "exa-kpi-pool-service", aggregateId: "2", version: 4, data: { poolId: "2", poolPeriodId: "20", poolCompositionId: "30", periodKey: "2026-08", periodStart: "2026-08-01", periodEnd: "2026-08-31", kpiCount: 1, memberships: [{ poolMembershipId: "40", kpiDefinitionId: "50", kpiConfigurationId: "60", definitionCode: "KPI-050", definitionName: "Productivity", configurationCode: "KPC-050-01", displayOrder: 1 }] } };
const pool = { id: "2", poolCode: "OPS-01-2026", poolName: "Operations", status: "ACTIVE", issueYear: 2026, validFrom: "2026-08-01", validTo: "2026-12-31", inputFrequency: { id: "1", code: "MONTHLY" }, companies: [], areas: [] };

beforeEach(() => { vi.clearAllMocks(); db.processedEvent.findUnique.mockResolvedValue(null); tx.processedEvent.findUnique.mockResolvedValue(null); poolClient.getPool.mockResolvedValue(pool); tx.poolPeriodReference.upsert.mockResolvedValue({ id: 99n }); db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx)); });

describe("Pool event consumer", () => {
  it("projects stable Pool Period, Composition and membership IDs atomically", async () => {
    await expect(processPoolEvent(event, event.eventType)).resolves.toBe("processed");
    expect(tx.poolPeriodReference.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ poolPeriodExternalId: 20n, poolCompositionExternalId: 30n }) }));
    expect(tx.poolPeriodMembershipReference.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ poolMembershipExternalId: 40n, kpiDefinitionExternalId: 50n, kpiConfigurationExternalId: 60n })] });
    expect(tx.processedEvent.create).toHaveBeenCalledOnce();
  });
  it("ignores a redelivered event already recorded in processed_events", async () => {
    db.processedEvent.findUnique.mockResolvedValue({ eventId: event.eventId });
    await expect(processPoolEvent(event, event.eventType)).resolves.toBe("duplicate");
    expect(poolClient.getPool).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { processedEvent: { findUnique: vi.fn() }, $transaction: vi.fn() },
  tx: {
    processedEvent: { findUnique: vi.fn(), create: vi.fn() },
    monitoringPeriodClosureReference: { upsert: vi.fn() },
  },
}));

vi.mock("../config/prisma.js", () => ({ prisma: mocks.prisma }));

import { processMonitoringClosedEvent } from "../consumers/monitoring-events.consumer.js";

const event = {
  eventId: "00000000-0000-4000-8000-000000000123",
  eventType: "monitoring.period.closed.v1",
  occurredAt: "2026-08-27T18:00:00.000Z",
  producer: "exa-monitoring-service",
  aggregateId: "11",
  version: 2,
  data: {
    monitoringPeriodId: "11",
    kpiPoolId: "5",
    poolInputPeriodId: "9",
    periodKey: "2026-08",
    closedAt: "2026-08-27T18:00:00.000Z",
    closedWithExceptions: false,
  },
};

describe("Monitoring CLOSED consumer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.processedEvent.findUnique.mockResolvedValue(null);
    mocks.tx.processedEvent.findUnique.mockResolvedValue(null);
    mocks.tx.monitoringPeriodClosureReference.upsert.mockResolvedValue({});
    mocks.tx.processedEvent.create.mockResolvedValue({});
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx));
  });

  it("ignores an event already registered before opening a transaction", async () => {
    mocks.prisma.processedEvent.findUnique.mockResolvedValue({ eventId: event.eventId });
    await expect(processMonitoringClosedEvent(event, event.eventType)).resolves.toBe("duplicate");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("checks idempotency again inside the transaction to close the worker race", async () => {
    mocks.tx.processedEvent.findUnique.mockResolvedValue({ eventId: event.eventId });
    await expect(processMonitoringClosedEvent(event, event.eventType)).resolves.toBe("duplicate");
    expect(mocks.tx.monitoringPeriodClosureReference.upsert).not.toHaveBeenCalled();
  });

  it("persists the closure projection and processed marker in one transaction", async () => {
    await expect(processMonitoringClosedEvent(event, event.eventType)).resolves.toBe("processed");
    expect(mocks.tx.monitoringPeriodClosureReference.upsert).toHaveBeenCalledOnce();
    expect(mocks.tx.processedEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: event.eventId }) });
  });

  it("propagates a marker failure so Prisma rolls back the projection", async () => {
    mocks.tx.processedEvent.create.mockRejectedValue(new Error("unique constraint"));
    await expect(processMonitoringClosedEvent(event, event.eventType)).rejects.toThrow("unique constraint");
    expect(mocks.tx.monitoringPeriodClosureReference.upsert).toHaveBeenCalledOnce();
  });
});

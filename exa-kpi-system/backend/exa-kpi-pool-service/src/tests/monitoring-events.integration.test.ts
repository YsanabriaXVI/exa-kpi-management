import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { processMonitoringClosedEvent } from "../consumers/monitoring-events.consumer.js";

const integration = process.env.RUN_POOL_INTEGRATION === "true" ? describe : describe.skip;
const suffix = BigInt(Date.now());
const poolId = 8_000_000_000_000n + suffix;
const inputPeriodId = 9_000_000_000_000n + suffix;
const monitoringPeriodId = 7_000_000_000_000n + suffix;
const eventId = randomUUID();

const event = {
  eventId,
  eventType: "monitoring.period.closed.v1",
  occurredAt: new Date().toISOString(),
  producer: "exa-monitoring-service",
  aggregateId: monitoringPeriodId.toString(),
  version: 1,
  data: {
    monitoringPeriodId: monitoringPeriodId.toString(),
    kpiPoolId: poolId.toString(),
    poolInputPeriodId: inputPeriodId.toString(),
    periodKey: "integration-test",
    closedAt: new Date().toISOString(),
    closedWithExceptions: false,
  },
};

integration("Monitoring closure projection on MySQL 8", () => {
  afterAll(async () => {
    await prisma.processedEvent.deleteMany({ where: { eventId: { in: [eventId] } } });
    await prisma.monitoringPeriodClosureReference.deleteMany({ where: { kpiPoolId: poolId } });
    await prisma.$disconnect();
  });

  it("processes a redelivered event exactly once", async () => {
    await expect(processMonitoringClosedEvent(event, event.eventType)).resolves.toBe("processed");
    await expect(processMonitoringClosedEvent(event, event.eventType)).resolves.toBe("duplicate");
    await expect(prisma.monitoringPeriodClosureReference.count({ where: { sourceEventId: eventId } })).resolves.toBe(1);
    await expect(prisma.processedEvent.count({ where: { eventId } })).resolves.toBe(1);
  });

  it("rolls back the closure and marker together when the transaction fails", async () => {
    const rollbackEventId = randomUUID();
    const rollbackMonitoringId = monitoringPeriodId + 1n;
    const rollbackInputId = inputPeriodId + 1n;
    await expect(prisma.$transaction(async (tx) => {
      await tx.monitoringPeriodClosureReference.create({ data: {
        monitoringPeriodExternalId: rollbackMonitoringId,
        kpiPoolId: poolId,
        poolInputPeriodExternalId: rollbackInputId,
        periodKey: "rollback-test",
        closureType: "NORMAL",
        closedAt: new Date(),
        sourceVersion: 1,
        sourceEventId: rollbackEventId,
      } });
      await tx.processedEvent.create({ data: {
        eventId: rollbackEventId,
        eventType: event.eventType,
        subject: event.eventType,
      } });
      throw new Error("forced rollback");
    })).rejects.toThrow("forced rollback");
    await expect(prisma.monitoringPeriodClosureReference.count({ where: { sourceEventId: rollbackEventId } })).resolves.toBe(0);
    await expect(prisma.processedEvent.count({ where: { eventId: rollbackEventId } })).resolves.toBe(0);
  });
});

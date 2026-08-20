import { describe, expect, it } from "vitest";
import { validateEventEnvelope } from "../events/event-envelope.js";

describe("event envelope", () => {
  it("accepts string aggregate IDs and the standard producer", () => {
    const event = validateEventEnvelope({
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "kpi.pool.activated.v1",
      occurredAt: "2026-08-20T12:00:00.000Z",
      producer: "exa-kpi-pool-service",
      aggregateType: "kpi_pool",
      aggregateId: "17",
      version: 1,
      data: {},
    });
    expect(event.aggregateId).toBe("17");
  });

  it("rejects numeric aggregate IDs", () => {
    expect(() => validateEventEnvelope({
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "kpi.pool.activated.v1",
      occurredAt: "2026-08-20T12:00:00.000Z",
      producer: "exa-kpi-pool-service",
      aggregateType: "kpi_pool",
      aggregateId: 17,
      version: 1,
      data: {},
    })).toThrow();
  });
});

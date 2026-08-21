import { z } from "zod";

export const eventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().regex(/^kpi\.pool\.[a-z.]+\.v\d+$/),
  occurredAt: z.string().datetime(),
  producer: z.literal("exa-kpi-pool-service"),
  aggregateType: z.literal("kpi_pool"),
  aggregateId: z.string().min(1),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export const plannedPoolEventTypes = [
  "kpi.pool.activated.v1",
  "kpi.pool.deactivated.v1",
  "kpi.pool.kpi.added.v1",
  "kpi.pool.kpi.retired.v1",
  "kpi.pool.period.composition.finalized.v1",
  "kpi.pool.validity.extended.v1",
] as const;

export function validateEventEnvelope(value: unknown): EventEnvelope {
  return eventEnvelopeSchema.parse(value);
}

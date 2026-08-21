import { consumerOpts, createInbox, type JetStreamSubscription, JSONCodec } from "nats";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { kpiPoolClient, type PoolRecord } from "../clients/kpi-pool.client.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { natsManager } from "../config/nats.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const membershipSchema = z.object({
  poolMembershipId: z.string().regex(/^\d+$/), kpiDefinitionId: z.string().regex(/^\d+$/), kpiConfigurationId: z.string().regex(/^\d+$/),
  definitionCode: z.string(), definitionName: z.string(), configurationCode: z.string(), displayOrder: z.number().int().positive(),
  categoryName: z.string().nullable().optional(), goal: z.string().nullable().optional(), dataSource: z.string().nullable().optional(), measurementUnit: z.string().nullable().optional(),
});
const envelopeSchema = z.object({
  eventId: z.string().uuid(), eventType: z.string(), occurredAt: z.string().datetime(), producer: z.literal("exa-kpi-pool-service"),
  aggregateId: z.string().regex(/^\d+$/), version: z.number().int().positive(), data: z.record(z.unknown()),
});
const finalizedDataSchema = z.object({
  poolId: z.string().regex(/^\d+$/), poolPeriodId: z.string().regex(/^\d+$/), poolCompositionId: z.string().regex(/^\d+$/),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), periodStart: z.string(), periodEnd: z.string(), kpiCount: z.number().int().nonnegative(),
  memberships: z.array(membershipSchema),
});
const supportedEvents = new Set(["kpi.pool.activated.v1", "kpi.pool.deactivated.v1", "kpi.pool.validity.extended.v1", "kpi.pool.period.composition.finalized.v1"]);
const json = JSONCodec<unknown>();
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function upsertPoolReference(tx: Prisma.TransactionClient, pool: PoolRecord, sourceVersion: number, occurredAt: string) {
  await tx.poolReference.upsert({
    where: { kpiPoolExternalId: BigInt(pool.id) },
    create: { kpiPoolExternalId: BigInt(pool.id), poolCode: pool.poolCode, poolName: pool.poolName, statusCode: pool.status, validFrom: asDate(pool.validFrom), validTo: asDate(pool.validTo), inputFrequencyExternalId: BigInt(pool.inputFrequency.id), inputFrequencyCode: pool.inputFrequency.code, sourceVersion: BigInt(sourceVersion), sourceUpdatedAt: new Date(occurredAt) },
    update: { poolCode: pool.poolCode, poolName: pool.poolName, statusCode: pool.status, validFrom: asDate(pool.validFrom), validTo: asDate(pool.validTo), inputFrequencyExternalId: BigInt(pool.inputFrequency.id), inputFrequencyCode: pool.inputFrequency.code, sourceVersion: BigInt(sourceVersion), sourceUpdatedAt: new Date(occurredAt), syncedAt: new Date() },
  });
}

export async function processPoolEvent(raw: unknown, subject: string): Promise<"processed" | "duplicate" | "ignored"> {
  const envelope = envelopeSchema.parse(raw);
  if (!supportedEvents.has(envelope.eventType)) return "ignored";
  const alreadyProcessed = await prisma.processedEvent.findUnique({ where: { eventId: envelope.eventId } });
  if (alreadyProcessed) return "duplicate";
  const pool = await kpiPoolClient.getPool(envelope.aggregateId);
  const finalized = envelope.eventType === "kpi.pool.period.composition.finalized.v1" ? finalizedDataSchema.parse(envelope.data) : null;
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.processedEvent.findUnique({ where: { eventId: envelope.eventId } });
    if (duplicate) return "duplicate" as const;
    await upsertPoolReference(tx, pool, envelope.version, envelope.occurredAt);
    if (finalized) {
      const period = await tx.poolPeriodReference.upsert({
        where: { kpiPoolExternalId_periodStart: { kpiPoolExternalId: BigInt(finalized.poolId), periodStart: asDate(finalized.periodStart) } },
        create: { kpiPoolExternalId: BigInt(finalized.poolId), poolPeriodExternalId: BigInt(finalized.poolPeriodId), poolCompositionExternalId: BigInt(finalized.poolCompositionId), periodKey: finalized.periodKey, periodStart: asDate(finalized.periodStart), periodEnd: asDate(finalized.periodEnd), compositionStatusCode: "FINALIZED", kpiCountSnapshot: finalized.kpiCount, sourceVersion: BigInt(envelope.version), sourceUpdatedAt: new Date(envelope.occurredAt) },
        update: { poolPeriodExternalId: BigInt(finalized.poolPeriodId), poolCompositionExternalId: BigInt(finalized.poolCompositionId), periodKey: finalized.periodKey, periodEnd: asDate(finalized.periodEnd), compositionStatusCode: "FINALIZED", kpiCountSnapshot: finalized.kpiCount, sourceVersion: BigInt(envelope.version), sourceUpdatedAt: new Date(envelope.occurredAt), syncedAt: new Date() },
      });
      await tx.poolPeriodMembershipReference.deleteMany({ where: { poolPeriodReferenceId: period.id } });
      if (finalized.memberships.length) await tx.poolPeriodMembershipReference.createMany({ data: finalized.memberships.map((item) => ({ poolPeriodReferenceId: period.id, poolMembershipExternalId: BigInt(item.poolMembershipId), kpiDefinitionExternalId: BigInt(item.kpiDefinitionId), kpiConfigurationExternalId: BigInt(item.kpiConfigurationId), definitionCode: item.definitionCode, definitionName: item.definitionName, configurationCode: item.configurationCode, categoryName: item.categoryName ?? null, goalSnapshot: item.goal ?? null, dataSourceSnapshot: item.dataSource ?? null, measurementUnitSnapshot: item.measurementUnit ?? null, displayOrder: item.displayOrder })) });
    }
    await tx.processedEvent.create({ data: { eventId: envelope.eventId, eventType: envelope.eventType, subject, aggregateId: envelope.aggregateId, sourceService: envelope.producer } });
    return "processed" as const;
  });
}

class PoolEventsConsumer {
  private subscription?: JetStreamSubscription;
  async start() {
    const jetStream = natsManager.jetStream;
    if (!jetStream || this.subscription) return;
    const options = consumerOpts();
    options.durable(env.NATS_POOL_CONSUMER); options.deliverTo(createInbox()); options.manualAck(); options.ackExplicit(); options.deliverAll(); options.maxDeliver(5); options.bindStream(env.NATS_POOL_STREAM);
    this.subscription = await jetStream.subscribe("kpi.pool.>", options);
    void this.consume(this.subscription);
  }
  private async consume(subscription: JetStreamSubscription) {
    for await (const message of subscription) {
      try { await processPoolEvent(json.decode(message.data), message.subject); message.ack(); }
      catch (error) {
        const permanent = error instanceof z.ZodError || (error instanceof AppError && error.statusCode === 404);
        const log = permanent ? logger.warn.bind(logger) : logger.error.bind(logger);
        log({ err: error, subject: message.subject, permanent }, permanent ? "Legacy or orphan Pool event acknowledged without projection" : "Pool event processing failed; message will be redelivered");
        if (permanent) message.term(); else message.nak();
      }
    }
  }
  async stop() { const subscription = this.subscription; this.subscription = undefined; if (subscription) await subscription.destroy(); }
}
export const poolEventsConsumer = new PoolEventsConsumer();

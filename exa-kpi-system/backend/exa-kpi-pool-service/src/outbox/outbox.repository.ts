import { Prisma, type OutboxEvent } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class OutboxRepository {
  async claimPending(limit: number, workerId: string, lockTimeoutMs: number): Promise<OutboxEvent[]> {
    return prisma.$transaction(async (tx) => {
      const staleBefore = new Date(Date.now() - lockTimeoutMs);
      const rows = await tx.$queryRaw<Array<{ outbox_event_id: bigint }>>(Prisma.sql`
        SELECT outbox_event_id
        FROM outbox_events
        WHERE (
          (status IN ('PENDING', 'FAILED') AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP(3)))
          OR (status = 'PROCESSING' AND locked_at <= ${staleBefore})
        )
        ORDER BY occurred_at ASC, outbox_event_id ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);
      const ids = rows.map((row) => row.outbox_event_id);
      if (!ids.length) return [];
      await tx.outboxEvent.updateMany({ where: { id: { in: ids } }, data: { status: "PROCESSING", lockedAt: new Date(), lockedBy: workerId } });
      return tx.outboxEvent.findMany({ where: { id: { in: ids }, lockedBy: workerId }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
    });
  }

  async markPublished(id: bigint): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), lastError: null, nextAttemptAt: null, lockedAt: null, lockedBy: null },
    });
  }

  async markFailed(id: bigint, error: unknown, attemptCount: number, maxAttempts: number): Promise<void> {
    const retryDelayMilliseconds = Math.min(60_000, 1_000 * 2 ** Math.min(attemptCount, 6));
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        status: attemptCount + 1 >= maxAttempts ? "DEAD" : "FAILED",
        attemptCount: { increment: 1 },
        lastError: error instanceof Error ? error.message : String(error),
        nextAttemptAt: attemptCount + 1 >= maxAttempts ? null : new Date(Date.now() + retryDelayMilliseconds),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  static toPublishableJson(payload: Prisma.JsonValue): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(payload));
  }
}

export const outboxRepository = new OutboxRepository();

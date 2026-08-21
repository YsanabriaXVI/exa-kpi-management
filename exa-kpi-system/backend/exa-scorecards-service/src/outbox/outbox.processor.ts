import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { natsManager } from "../config/nats.js";
import { OutboxRepository, outboxRepository } from "./outbox.repository.js";

export class OutboxProcessor {
  private timer?: NodeJS.Timeout;
  private processing = false;
  private readonly workerId = `exa-scorecards-service:${randomUUID()}`;
  constructor(private readonly repository: OutboxRepository = outboxRepository) {}
  start() { if (!env.OUTBOX_PROCESSOR_ENABLED || this.timer) return; this.timer = setInterval(() => void this.processBatch(), env.OUTBOX_POLL_INTERVAL_MS); this.timer.unref(); void this.processBatch(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async processBatch() {
    const jetStream = natsManager.jetStream;
    if (this.processing || !jetStream) return;
    this.processing = true;
    try {
      const events = await this.repository.claimPending(env.OUTBOX_BATCH_SIZE, this.workerId, env.OUTBOX_LOCK_TIMEOUT_MS);
      for (const event of events) {
        try { await jetStream.publish(event.subject, OutboxRepository.encode(event.payload), { msgID: event.eventId }); await this.repository.markPublished(event.id); }
        catch (error) { await this.repository.markFailed(event.id, error, event.attemptCount, env.OUTBOX_MAX_ATTEMPTS); }
      }
    } catch (error) { logger.error({ error }, "Scorecards Outbox polling failed"); }
    finally { this.processing = false; }
  }
}
export const outboxProcessor = new OutboxProcessor();

import { connect, StorageType, type JetStreamClient, type NatsConnection } from "nats";
import { env } from "./env.js";
import { logger } from "./logger.js";

export type NatsConnectionState = "disabled" | "connecting" | "connected" | "degraded" | "closed";

class NatsManager {
  private connection?: NatsConnection;
  private client?: JetStreamClient;
  private state: NatsConnectionState = env.NATS_ENABLED ? "closed" : "disabled";
  private lastError?: string;

  get status() { return { state: this.state, ...(this.lastError ? { lastError: this.lastError } : {}) }; }
  get jetStream() { return this.client; }

  async start(): Promise<void> {
    if (!env.NATS_ENABLED || this.connection) return;
    this.state = "connecting";
    try {
      const connection = await connect({ servers: env.NATS_URL, name: env.NATS_NAME, reconnect: true, maxReconnectAttempts: -1 });
      const manager = await connection.jetstreamManager();
      try { await manager.streams.info(env.NATS_STREAM); }
      catch { await manager.streams.add({ name: env.NATS_STREAM, subjects: [env.NATS_SUBJECTS], storage: StorageType.File }); }
      this.connection = connection;
      this.client = connection.jetstream();
      this.state = "connected";
      this.lastError = undefined;
      void connection.closed().then((error) => {
        this.connection = undefined;
        this.client = undefined;
        if (this.state !== "closed") { this.state = "degraded"; this.lastError = error?.message ?? "NATS connection closed"; }
      });
    } catch (error) {
      this.state = "degraded";
      this.lastError = error instanceof Error ? error.message : String(error);
      logger.warn({ error }, "NATS unavailable; HTTP remains available and Outbox events remain pending");
    }
  }

  async stop(): Promise<void> {
    this.state = env.NATS_ENABLED ? "closed" : "disabled";
    const connection = this.connection;
    this.connection = undefined;
    this.client = undefined;
    if (connection && !connection.isClosed()) await connection.drain();
  }
}

export const natsManager = new NatsManager();

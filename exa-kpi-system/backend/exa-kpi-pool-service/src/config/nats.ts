import {
  connect,
  type JetStreamClient,
  type NatsConnection,
  StorageType,
} from "nats";
import { env } from "./env.js";
import { logger } from "./logger.js";

export type NatsConnectionState = "disabled" | "connecting" | "connected" | "degraded" | "closed";

class NatsManager {
  private connection?: NatsConnection;
  private jetStreamClient?: JetStreamClient;
  private state: NatsConnectionState = env.NATS_ENABLED ? "closed" : "disabled";
  private lastError?: string;
  private connectionPromise?: Promise<void>;

  get status(): { state: NatsConnectionState; lastError?: string } {
    return { state: this.state, ...(this.lastError ? { lastError: this.lastError } : {}) };
  }

  get jetStream(): JetStreamClient | undefined {
    return this.jetStreamClient;
  }

  async start(): Promise<void> {
    if (!env.NATS_ENABLED || this.connection || this.connectionPromise) return this.connectionPromise;

    this.state = "connecting";
    this.connectionPromise = this.connectInternal().finally(() => {
      this.connectionPromise = undefined;
    });
    return this.connectionPromise;
  }

  private async connectInternal(): Promise<void> {
    try {
      const connection = await connect({
        servers: env.NATS_URL,
        name: env.NATS_NAME,
        reconnect: true,
        maxReconnectAttempts: -1,
      });
      const manager = await connection.jetstreamManager();
      try {
        await manager.streams.info(env.NATS_STREAM);
      } catch {
        await manager.streams.add({
          name: env.NATS_STREAM,
          subjects: [env.NATS_SUBJECTS],
          storage: StorageType.File,
        });
      }

      this.connection = connection;
      this.jetStreamClient = connection.jetstream();
      this.state = "connected";
      this.lastError = undefined;
      logger.info({ server: connection.getServer(), stream: env.NATS_STREAM }, "NATS JetStream connected");

      void connection.closed().then((error) => {
        this.connection = undefined;
        this.jetStreamClient = undefined;
        if (this.state !== "closed") {
          this.state = "degraded";
          this.lastError = error?.message ?? "NATS connection closed";
          logger.warn({ error }, "NATS connection closed");
        }
      });
    } catch (error) {
      this.state = "degraded";
      this.lastError = error instanceof Error ? error.message : String(error);
      logger.warn({ error }, "NATS is unavailable; HTTP remains available and Outbox events stay pending");
    }
  }

  async stop(): Promise<void> {
    this.state = env.NATS_ENABLED ? "closed" : "disabled";
    const connection = this.connection;
    this.connection = undefined;
    this.jetStreamClient = undefined;
    if (connection && !connection.isClosed()) await connection.drain();
  }
}

export const natsManager = new NatsManager();

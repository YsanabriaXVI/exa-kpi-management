import type { Server } from "node:http";
import { logger } from "./config/logger.js";
import { natsManager } from "./config/nats.js";
import { prisma } from "./config/prisma.js";
import { outboxProcessor } from "./outbox/outbox.processor.js";

let terminating = false;

export function registerTerminationHandlers(server: Server): void {
  const terminate = async (signal: NodeJS.Signals): Promise<void> => {
    if (terminating) return;
    terminating = true;
    logger.info({ signal }, "Graceful shutdown started");
    outboxProcessor.stop();
    server.close(async () => {
      await Promise.allSettled([natsManager.stop(), prisma.$disconnect()]);
      logger.info("Graceful shutdown completed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once("SIGINT", () => void terminate("SIGINT"));
  process.once("SIGTERM", () => void terminate("SIGTERM"));
}

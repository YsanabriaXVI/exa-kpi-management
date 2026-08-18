import type { Server } from "node:http";
import { prisma } from "./config/database/prisma.js";
import { logger } from "./config/logger.js";

export function registerTerminationHandlers(server: Server) {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");

    server.close(async (serverError) => {
      try {
        await prisma.$disconnect();
      } finally {
        if (serverError) logger.error({ err: serverError }, "HTTP server shutdown failed");
        process.exit(serverError ? 1 : 0);
      }
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

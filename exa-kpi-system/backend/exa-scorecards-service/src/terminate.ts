import type { Server } from "node:http";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { natsManager } from "./config/nats.js";
import { outboxProcessor } from "./outbox/outbox.processor.js";
import { poolEventsConsumer } from "./consumers/pool-events.consumer.js";
let terminating = false;
export function registerTerminationHandlers(server: Server): void { const terminate = (signal: NodeJS.Signals) => { if (terminating) return; terminating = true; logger.info({ signal }, "Graceful shutdown started"); outboxProcessor.stop(); server.close(async () => { await poolEventsConsumer.stop(); await natsManager.stop(); await prisma.$disconnect(); logger.info("Graceful shutdown completed"); process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); }; process.once("SIGINT", () => terminate("SIGINT")); process.once("SIGTERM", () => terminate("SIGTERM")); }

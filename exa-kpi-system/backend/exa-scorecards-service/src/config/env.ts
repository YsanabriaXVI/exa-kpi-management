import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4003),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TEMPORARY_ACTOR_USER_ID: z.coerce.bigint().positive().default(1n),
  KPI_POOL_BASE_URL: z.string().url().default("http://localhost:4002"),
  KPI_POOL_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(5_000),
  NATS_ENABLED: z.string().default("true").transform((value) => value === "true"),
  NATS_URL: z.string().default("nats://localhost:4222"),
  NATS_NAME: z.string().default("exa-scorecards-service"),
  NATS_STREAM: z.string().default("SCORECARD_EVENTS"),
  NATS_SUBJECTS: z.string().default("scorecard.>"),
  NATS_POOL_STREAM: z.string().default("EXA_KPI_POOL_EVENTS"),
  NATS_POOL_CONSUMER: z.string().default("exa-scorecards-pool-events-v2"),
  OUTBOX_PROCESSOR_ENABLED: z.string().default("true").transform((value) => value === "true"),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(25),
  OUTBOX_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
export const env = parsed.data;

import "dotenv/config";
import { z } from "zod";

const booleanFromEnvironment = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4002),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TEMPORARY_ACTOR_USER_ID: z.coerce.bigint().positive().default(1n),
  KPI_MANAGEMENT_BASE_URL: z.string().url().default("http://localhost:4001"),
  KPI_MANAGEMENT_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(5_000),
  NATS_ENABLED: booleanFromEnvironment,
  NATS_URL: z.string().url().default("nats://localhost:4222"),
  NATS_NAME: z.string().min(1).default("exa-kpi-pool-service"),
  NATS_STREAM: z.string().min(1).default("EXA_KPI_POOL_EVENTS"),
  NATS_SUBJECTS: z.string().min(1).default("kpi.pool.>"),
  OUTBOX_PROCESSOR_ENABLED: booleanFromEnvironment,
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(20),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().max(100).default(10),
  OUTBOX_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnvironment.error.message}`);
}

export const env = parsedEnvironment.data;
export type Environment = z.infer<typeof environmentSchema>;

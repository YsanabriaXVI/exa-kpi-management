import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"), PORT: z.coerce.number().int().positive().max(65535).default(4004), DATABASE_URL: z.string().min(1), LOG_LEVEL: z.enum(["fatal","error","warn","info","debug","trace","silent"]).default("info"), CORS_ORIGIN: z.string().default("http://localhost:5173"), TEMPORARY_ACTOR_USER_ID: z.coerce.bigint().positive().default(1n),
  KPI_POOL_BASE_URL: z.string().url().default("http://localhost:4002"), SCORECARDS_BASE_URL: z.string().url().default("http://localhost:4003"), KPI_MANAGEMENT_BASE_URL: z.string().url().default("http://localhost:4001"), SERVICE_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(5000),
  NATS_ENABLED: z.string().default("false").transform((value) => value === "true"), NATS_URL: z.string().default("nats://localhost:4222"), NATS_NAME: z.string().default("exa-monitoring-service"), NATS_STREAM: z.string().default("MONITORING_EVENTS"), NATS_SUBJECTS: z.string().default("monitoring.>"), OUTBOX_PROCESSOR_ENABLED:z.string().default("true").transform((value)=>value==="true"),OUTBOX_POLL_INTERVAL_MS:z.coerce.number().int().positive().default(2000),OUTBOX_BATCH_SIZE:z.coerce.number().int().positive().max(100).default(20),OUTBOX_LOCK_TIMEOUT_MS:z.coerce.number().int().positive().default(30000),OUTBOX_MAX_ATTEMPTS:z.coerce.number().int().positive().default(10),
});
export const env = schema.parse(process.env);

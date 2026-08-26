import { defineConfig } from "vitest/config";
const integration = process.env.RUN_MONITORING_INTEGRATION === "true";
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts"], env: { NODE_ENV: "test", DATABASE_URL: integration ? process.env.DATABASE_URL! : "mysql://test:test@localhost:3306/exa_monitoring_test", LOG_LEVEL: "silent", NATS_ENABLED: "false", RUN_MONITORING_INTEGRATION: String(integration) } } });

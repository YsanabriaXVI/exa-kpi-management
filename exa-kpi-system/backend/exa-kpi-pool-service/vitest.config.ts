import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.RUN_POOL_INTEGRATION === "true"
        ? (process.env.DATABASE_URL ?? "mysql://exa_kpi_pool:exa_pool_dev@localhost:3306/exa_kpi_pool")
        : "mysql://test:test@localhost:3306/exa_kpi_pool_test",
      NATS_URL: "nats://localhost:4222",
      NATS_ENABLED: "false",
      OUTBOX_PROCESSOR_ENABLED: "false",
      LOG_LEVEL: "silent"
    }
  }
});

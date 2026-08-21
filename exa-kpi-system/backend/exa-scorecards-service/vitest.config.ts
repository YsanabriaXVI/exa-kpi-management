import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts"], env: { NODE_ENV: "test", DATABASE_URL: "mysql://test:test@localhost:3306/exa_scorecard_test", LOG_LEVEL: "silent" } } });

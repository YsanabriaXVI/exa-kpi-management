import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { temporaryIdentityMiddleware } from "./middlewares/temporary-identity.middleware.js";
import { openApiDocument } from "./openapi.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";
import type { DatabaseCheck } from "./services/health.service.js";
export function createApp(options: { databaseCheck?: DatabaseCheck } = {}) {
  const app = express(); app.disable("x-powered-by"); app.use(helmet()); app.use(cors({ origin: env.CORS_ORIGIN })); app.use(express.json({ limit: "1mb" })); app.use(pinoHttp({ logger })); app.use(temporaryIdentityMiddleware);
  app.use("/api/health", createHealthRouter(options.databaseCheck)); app.use("/api", apiRouter); app.get("/api/docs/openapi.json", (_request, response) => response.json(openApiDocument)); app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument)); app.use(notFoundMiddleware); app.use(errorMiddleware); return app;
}
export const app = createApp();

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { temporaryIdentity } from "./middlewares/temporary-identity.middleware.js";
import { registerOpenApi } from "./openapi.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(temporaryIdentity);
registerOpenApi(app);
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

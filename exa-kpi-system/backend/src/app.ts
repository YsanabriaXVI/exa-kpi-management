import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { demoRoutes } from "./routes/demo.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

app.use("/api/demo", demoRoutes);

app.use(errorMiddleware);

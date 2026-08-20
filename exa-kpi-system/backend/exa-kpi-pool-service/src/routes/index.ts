import { Router } from "express";
import { kpiPoolRouter } from "./kpi-pool.routes.js";

export const apiRouter = Router();
apiRouter.use("/v1/kpi-pools", kpiPoolRouter);

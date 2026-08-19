import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { kpiCategoryRouter } from "./kpi-category.routes.js";
import { kpiDefinitionRouter } from "./kpi-definition.routes.js";
import { kpiConfigurationRouter } from "./kpi-configuration.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/v1/kpi-definitions", kpiDefinitionRouter);
apiRouter.use("/v1/kpi-categories", kpiCategoryRouter);
apiRouter.use("/v1/kpi-configurations", kpiConfigurationRouter);

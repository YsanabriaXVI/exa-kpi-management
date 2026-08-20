import { Router } from "express";
import { listInternalKpiConfigurationCatalog } from "../controllers/kpi-configuration.controller.js";

export const internalKpiConfigurationRouter = Router();
internalKpiConfigurationRouter.get("/", listInternalKpiConfigurationCatalog);

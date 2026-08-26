import { Router } from "express";
import { effectiveKpiConfigurationSnapshots, listInternalKpiConfigurationCatalog } from "../controllers/kpi-configuration.controller.js";

export const internalKpiConfigurationRouter = Router();
internalKpiConfigurationRouter.get("/", listInternalKpiConfigurationCatalog);
internalKpiConfigurationRouter.post("/effective-snapshots", effectiveKpiConfigurationSnapshots);

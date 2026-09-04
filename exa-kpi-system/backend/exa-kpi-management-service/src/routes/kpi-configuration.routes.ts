import { Router } from "express";
import { batchLookupKpiConfigurations, createKpiConfiguration, deactivateKpiConfiguration, getKpiConfiguration, listKpiConfigurationLookups, listKpiConfigurations, softDeleteKpiConfiguration, updateKpiConfiguration } from "../controllers/kpi-configuration.controller.js";

export const kpiConfigurationRouter = Router();
kpiConfigurationRouter.get("/", listKpiConfigurations);
kpiConfigurationRouter.get("/lookups", listKpiConfigurationLookups);
kpiConfigurationRouter.post("/batch-lookup", batchLookupKpiConfigurations);
kpiConfigurationRouter.get("/:id", getKpiConfiguration);
kpiConfigurationRouter.post("/", createKpiConfiguration);
kpiConfigurationRouter.patch("/:id", updateKpiConfiguration);
kpiConfigurationRouter.patch("/:id/deactivate", deactivateKpiConfiguration);
kpiConfigurationRouter.delete("/:id", softDeleteKpiConfiguration);

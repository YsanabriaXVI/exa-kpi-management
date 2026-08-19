import { Router } from "express";
import {
  activateKpiDefinition,
  createKpiDefinition,
  deleteKpiDefinition,
  deactivateKpiDefinition,
  getKpiDefinition,
  listKpiDefinitionConfigurations,
  listKpiDefinitions,
  updateKpiDefinition,
} from "../controllers/kpi-definition.controller.js";

export const kpiDefinitionRouter = Router();

kpiDefinitionRouter.get("/", listKpiDefinitions);
kpiDefinitionRouter.get("/:id/configurations", listKpiDefinitionConfigurations);
kpiDefinitionRouter.get("/:id", getKpiDefinition);
kpiDefinitionRouter.post("/", createKpiDefinition);
kpiDefinitionRouter.patch("/:id", updateKpiDefinition);
kpiDefinitionRouter.delete("/:id", deleteKpiDefinition);
kpiDefinitionRouter.patch("/:id/activate", activateKpiDefinition);
kpiDefinitionRouter.patch("/:id/deactivate", deactivateKpiDefinition);

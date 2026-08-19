import { Router } from "express";
import { listActiveKpiCategories } from "../controllers/kpi-category.controller.js";

export const kpiCategoryRouter = Router();
kpiCategoryRouter.get("/", listActiveKpiCategories);

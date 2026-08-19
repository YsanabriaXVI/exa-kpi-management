import type { NextFunction, Request, Response } from "express";
import { kpiCategoryService } from "../services/kpi-category.service.js";

export async function listActiveKpiCategories(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await kpiCategoryService.listActive() });
  } catch (error) { next(error); }
}

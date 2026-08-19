import type { Request, Response } from "express";
import { healthService } from "../services/health.service.js";

export async function getLiveness(_request: Request, response: Response) {
  response.json({ data: { status: "ok", service: "exa-kpi-management-service" } });
}

export async function getReadiness(
  _request: Request,
  response: Response,
  _next: unknown,
) {
  try {
    await healthService.assertDatabaseReady();
    response.json({ data: { status: "ready", database: "reachable" } });
  } catch {
    response.status(503).json({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database dependency is unavailable" },
    });
  }
}

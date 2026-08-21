import type { NextFunction, Request, Response } from "express";
import type { DatabaseCheck } from "../services/health.service.js";
import { getReadiness } from "../services/health.service.js";
export function live(_request: Request, response: Response): void { response.status(200).json({ status: "live", service: "exa-scorecards-service" }); }
export function ready(databaseCheck: DatabaseCheck) { return async (_request: Request, response: Response, _next: NextFunction): Promise<void> => { try { response.status(200).json(await getReadiness(databaseCheck)); } catch { response.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "The Scorecards database is unavailable" } }); } }; }

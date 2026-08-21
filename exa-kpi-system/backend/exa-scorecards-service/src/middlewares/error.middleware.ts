import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";
export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) { response.status(error.statusCode).json({ error: { code: error.code, message: error.message, details: error.details } }); return; }
  if (error instanceof ZodError) { response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() } }); return; }
  logger.error({ error, errorMessage: error instanceof Error ? error.message : String(error) }, "Unhandled request error");
  response.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });
};

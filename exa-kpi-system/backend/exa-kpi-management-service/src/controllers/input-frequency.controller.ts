import type { NextFunction, Request, Response } from "express";
import { inputFrequencyService } from "../services/input-frequency.service.js";

export async function listInputFrequencies(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ data: await inputFrequencyService.list() });
  } catch (error) { next(error); }
}

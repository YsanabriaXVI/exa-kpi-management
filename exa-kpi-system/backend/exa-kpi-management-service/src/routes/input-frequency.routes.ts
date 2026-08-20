import { Router } from "express";
import { listInputFrequencies } from "../controllers/input-frequency.controller.js";

export const inputFrequencyRouter = Router();
inputFrequencyRouter.get("/", listInputFrequencies);

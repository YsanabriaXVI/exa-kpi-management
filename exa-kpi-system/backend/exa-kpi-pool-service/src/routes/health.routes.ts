import { Router } from "express";
import { live, ready } from "../controllers/health.controller.js";
import { checkDatabase, type DatabaseCheck } from "../services/health.service.js";

export function createHealthRouter(databaseCheck: DatabaseCheck = checkDatabase): Router {
  const router = Router();
  router.get("/live", live);
  router.get("/ready", ready(databaseCheck));
  return router;
}

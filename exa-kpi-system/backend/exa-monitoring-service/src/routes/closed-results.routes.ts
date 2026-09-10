import { Router } from "express";
import { z } from "zod";
import { closedResultsService } from "../services/closed-results.service.js";
export const closedResultsRouter = Router();
const id = z.string().regex(/^[1-9]\d*$/).max(19);
closedResultsRouter.get("/", async (req, res, next) => {
  try { const query = z.object({ after: id.optional() }).strict().parse(req.query); res.json(await closedResultsService.list(query.after)); } catch (error) { next(error); }
});
closedResultsRouter.get("/:id", async (req, res, next) => {
  try { res.json(await closedResultsService.get(id.parse(req.params.id))); } catch (error) { next(error); }
});

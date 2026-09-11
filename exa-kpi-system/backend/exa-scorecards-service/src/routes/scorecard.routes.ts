import { Router } from "express";
import { z } from "zod";
import { scorecardCompositionService } from "../services/scorecard-composition.service.js";
import { removeScorecard, createScorecard, deactivateScorecard, eligiblePools, getScorecard, listScorecards, updateScorecard } from "../controllers/scorecard.controller.js";
import { addKpis, addLink, availableKpis, availableLinks, finalizeComposition, frozenKpiUsage, getComposition, listPeriods, monitoringMaterialization, poolUsage, poolUsageBatch, poolWorkflow, removeKpi, removeLink, updateScope, updateWeights } from "../controllers/scorecard-composition.controller.js";
export const scorecardRouter = Router();
scorecardRouter.post("/internal/prepare-next-period", async (request, response, next) => {
  try {
    const body = z.object({ poolId: z.string().regex(/^\d+$/), sourcePeriodKey: z.string().min(1).max(50), targetPeriodKey: z.string().min(1).max(50) }).strict().parse(request.body);
    response.json(await scorecardCompositionService.prepareNextPeriod(BigInt(body.poolId), body.sourcePeriodKey, body.targetPeriodKey, request.identity.actorUserId));
  } catch (error) { next(error); }
});
scorecardRouter.get("/eligible-pools", eligiblePools);
scorecardRouter.get("/pool-workflow", poolWorkflow);
scorecardRouter.post("/pool-workflow/batch", poolUsageBatch);
scorecardRouter.get("/pool-usage", poolUsage);
scorecardRouter.get("/internal/monitoring-materialization", monitoringMaterialization);
scorecardRouter.get("/internal/frozen-kpi-usage", frozenKpiUsage);
scorecardRouter.get("/", listScorecards);
scorecardRouter.post("/", createScorecard);
scorecardRouter.get("/:id/periods", listPeriods);
scorecardRouter.get("/:id/periods/:periodKey/composition", getComposition);
scorecardRouter.get("/:id/periods/:periodKey/available-kpis", availableKpis);
scorecardRouter.post("/:id/periods/:periodKey/kpis", addKpis);
scorecardRouter.delete("/:id/periods/:periodKey/kpis/:configurationId", removeKpi);
scorecardRouter.patch("/:id/periods/:periodKey/weights", updateWeights);
scorecardRouter.put("/:id/periods/:periodKey/scope", updateScope);
scorecardRouter.get("/:id/periods/:periodKey/linked-scorecards", availableLinks);
scorecardRouter.post("/:id/periods/:periodKey/linked-scorecards", addLink);
scorecardRouter.delete("/:id/periods/:periodKey/linked-scorecards/:linkedScorecardId", removeLink);
scorecardRouter.post("/:id/periods/:periodKey/finalize", finalizeComposition);
scorecardRouter.get("/:id", getScorecard);
scorecardRouter.patch("/:id", updateScorecard);
scorecardRouter.patch("/:id/deactivate", deactivateScorecard);

scorecardRouter.delete("/:id", removeScorecard);

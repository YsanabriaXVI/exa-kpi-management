import type { NextFunction, Request, Response } from "express";
import { addPeriodKpisBodySchema, addPeriodLinkBodySchema, poolUsageBatchBodySchema, poolWorkflowQuerySchema, scorecardPeriodKpiParamsSchema, scorecardPeriodLinkParamsSchema, scorecardPeriodParamsSchema, updatePeriodWeightsBodySchema } from "../schemas/scorecard.schema.js";
import { scorecardCompositionService } from "../services/scorecard-composition.service.js";

type Handler = (request: Request, response: Response) => Promise<void>;
const handle = (handler: Handler) => (request: Request, response: Response, next: NextFunction) => handler(request, response).catch(next);

export const poolWorkflow = handle(async (request, response) => { const query = poolWorkflowQuerySchema.parse(request.query); response.json(await scorecardCompositionService.poolWorkflow(BigInt(query.poolId), query.periodKey)); });
export const poolUsageBatch = handle(async (request, response) => { const body = poolUsageBatchBodySchema.parse(request.body); response.json(await scorecardCompositionService.poolUsageBatch(body.targets)); });
export const listPeriods = handle(async (request, response) => { const { id } = scorecardPeriodParamsSchema.parse({ ...request.params, periodKey: "2000-01" }); response.json(await scorecardCompositionService.periods(BigInt(id))); });
export const getComposition = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.json({ data: await scorecardCompositionService.get(BigInt(p.id), p.periodKey, request.identity.actorUserId) }); });
export const availableKpis = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.json(await scorecardCompositionService.availableKpis(BigInt(p.id), p.periodKey)); });
export const addKpis = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.status(201).json({ data: await scorecardCompositionService.addKpis(BigInt(p.id), p.periodKey, addPeriodKpisBodySchema.parse(request.body).items, request.identity.actorUserId) }); });
export const removeKpi = handle(async (request, response) => { const p = scorecardPeriodKpiParamsSchema.parse(request.params); await scorecardCompositionService.removeKpi(BigInt(p.id), p.periodKey, BigInt(p.configurationId)); response.status(204).end(); });
export const availableLinks = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.json(await scorecardCompositionService.availableLinks(BigInt(p.id), p.periodKey)); });
export const addLink = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); const body = addPeriodLinkBodySchema.parse(request.body); response.status(201).json({ data: await scorecardCompositionService.addLink(BigInt(p.id), p.periodKey, BigInt(body.linkedScorecardId), body.weight, request.identity.actorUserId) }); });
export const removeLink = handle(async (request, response) => { const p = scorecardPeriodLinkParamsSchema.parse(request.params); await scorecardCompositionService.removeLink(BigInt(p.id), p.periodKey, BigInt(p.linkedScorecardId)); response.status(204).end(); });
export const updateWeights = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.json({ data: await scorecardCompositionService.updateWeights(BigInt(p.id), p.periodKey, updatePeriodWeightsBodySchema.parse(request.body)) }); });
export const finalizeComposition = handle(async (request, response) => { const p = scorecardPeriodParamsSchema.parse(request.params); response.json({ data: await scorecardCompositionService.finalize(BigInt(p.id), p.periodKey, request.identity.actorUserId) }); });

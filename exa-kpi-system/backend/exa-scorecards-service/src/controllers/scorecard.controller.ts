import type { NextFunction, Request, Response } from "express";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { createScorecardBodySchema, listScorecardsQuerySchema, scorecardIdParamsSchema, updateScorecardBodySchema } from "../schemas/scorecard.schema.js";
import { scorecardService } from "../services/scorecard.service.js";
export async function eligiblePools(_request: Request, response: Response, next: NextFunction) { try { response.json({ data: await kpiPoolClient.eligiblePools() }); } catch (error) { next(error); } }
export async function listScorecards(request: Request, response: Response, next: NextFunction) { try { response.json(await scorecardService.list(listScorecardsQuerySchema.parse(request.query))); } catch (error) { next(error); } }
export async function getScorecard(request: Request, response: Response, next: NextFunction) { try { const { id } = scorecardIdParamsSchema.parse(request.params); response.json({ data: await scorecardService.get(BigInt(id)) }); } catch (error) { next(error); } }
export async function createScorecard(request: Request, response: Response, next: NextFunction) { try { response.status(201).json({ data: await scorecardService.create(createScorecardBodySchema.parse(request.body), request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function updateScorecard(request: Request, response: Response, next: NextFunction) { try { const { id } = scorecardIdParamsSchema.parse(request.params); response.json({ data: await scorecardService.update(BigInt(id), updateScorecardBodySchema.parse(request.body), request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function deactivateScorecard(request: Request, response: Response, next: NextFunction) { try { const { id } = scorecardIdParamsSchema.parse(request.params); response.json({ data: await scorecardService.deactivate(BigInt(id), request.identity.actorUserId) }); } catch (error) { next(error); } }

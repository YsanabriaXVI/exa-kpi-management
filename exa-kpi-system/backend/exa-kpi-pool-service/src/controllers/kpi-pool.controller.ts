import type { NextFunction, Request, Response } from "express";
import { addKpiPoolConfigurationsBodySchema, availableKpiConfigurationsQuerySchema, createKpiPoolBodySchema, finalizePeriodCompositionBodySchema, kpiConfigurationUsageBodySchema, kpiPoolConfigurationParamsSchema, kpiPoolIdParamsSchema, listKpiPoolsQuerySchema, replaceKpiPoolConfigurationBodySchema, retireKpiPoolConfigurationBodySchema, targetPeriodQuerySchema, updateKpiPoolBodySchema } from "../schemas/kpi-pool.schema.js";
import { kpiPoolService } from "../services/kpi-pool.service.js";
import { kpiPoolMembershipService } from "../services/kpi-pool-membership.service.js";
import { kpiPoolLifecycleService } from "../services/kpi-pool-lifecycle.service.js";

export async function listKpiPools(request: Request, response: Response, next: NextFunction) {
  try { response.json(await kpiPoolService.list(listKpiPoolsQuerySchema.parse(request.query))); } catch (error) { next(error); }
}

export async function getKpiPool(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiPoolIdParamsSchema.parse(request.params);
    response.json({ data: await kpiPoolService.getById(BigInt(id)) });
  } catch (error) { next(error); }
}

export async function createKpiPool(request: Request, response: Response, next: NextFunction) {
  try {
    const input = createKpiPoolBodySchema.parse(request.body);
    response.status(201).json({ data: await kpiPoolService.create(input, request.identity.actorUserId) });
  } catch (error) { next(error); }
}

export async function updateKpiPool(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiPoolIdParamsSchema.parse(request.params);
    const input = updateKpiPoolBodySchema.parse(request.body);
    response.json({ data: await kpiPoolService.update(BigInt(id), input, request.identity.actorUserId) });
  } catch (error) { next(error); }
}

export async function getKpiPoolLookups(_request: Request, response: Response, next: NextFunction) {
  try { response.json({ data: await kpiPoolService.lookups() }); } catch (error) { next(error); }
}

export async function listPoolKpiConfigurations(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json(await kpiPoolMembershipService.list(BigInt(id), targetPeriodQuerySchema.parse(request.query))); } catch (error) { next(error); } }
export async function addPoolKpiConfigurations(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); const body = addKpiPoolConfigurationsBodySchema.parse(request.body); response.status(201).json(await kpiPoolMembershipService.add(BigInt(id), body, request.identity.actorUserId)); } catch (error) { next(error); } }
export async function removePoolKpiConfiguration(request: Request, response: Response, next: NextFunction) { try { const { id, configurationId } = kpiPoolConfigurationParamsSchema.parse(request.params); response.json({ data: await kpiPoolMembershipService.remove(BigInt(id), BigInt(configurationId)) }); } catch (error) { next(error); } }
export async function retirePoolKpiConfiguration(request: Request, response: Response, next: NextFunction) { try { const { id, configurationId } = kpiPoolConfigurationParamsSchema.parse(request.params); const body = retireKpiPoolConfigurationBodySchema.parse(request.body); response.json({ data: await kpiPoolMembershipService.retire(BigInt(id), BigInt(configurationId), body, request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function replacePoolKpiConfiguration(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); const body = replaceKpiPoolConfigurationBodySchema.parse(request.body); response.json({ data: await kpiPoolMembershipService.replace(BigInt(id), body, request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function listKpiPoolPeriods(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json(await kpiPoolMembershipService.periods(BigInt(id))); } catch (error) { next(error); } }
export async function finalizeKpiPoolPeriodComposition(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); const body = finalizePeriodCompositionBodySchema.parse(request.body); response.json({ data: await kpiPoolMembershipService.finalizePeriod(BigInt(id), body.periodStart, request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function listAvailableKpiConfigurations(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json(await kpiPoolMembershipService.availability(BigInt(id), availableKpiConfigurationsQuerySchema.parse(request.query))); } catch (error) { next(error); } }
export async function getActivationReadiness(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json({ data: await kpiPoolLifecycleService.readiness(BigInt(id)) }); } catch (error) { next(error); } }
export async function activateKpiPool(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json({ data: await kpiPoolLifecycleService.activate(BigInt(id), request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function deactivateKpiPool(request: Request, response: Response, next: NextFunction) { try { const { id } = kpiPoolIdParamsSchema.parse(request.params); response.json({ data: await kpiPoolLifecycleService.deactivate(BigInt(id), request.identity.actorUserId) }); } catch (error) { next(error); } }
export async function getKpiConfigurationUsage(request: Request, response: Response, next: NextFunction) { try { const { configurationIds } = kpiConfigurationUsageBodySchema.parse(request.body); response.json(await kpiPoolMembershipService.usage(configurationIds)); } catch (error) { next(error); } }

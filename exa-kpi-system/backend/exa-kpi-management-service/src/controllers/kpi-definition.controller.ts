import type { NextFunction, Request, Response } from "express";
import {
  createKpiDefinitionBodySchema,
  kpiDefinitionIdParamsSchema,
  listKpiDefinitionsQuerySchema,
  updateKpiDefinitionBodySchema,
} from "../schemas/kpi-definition.schema.js";
import { paginationSchema } from "../schemas/pagination.schema.js";
import { kpiDefinitionService } from "../services/kpi-definition.service.js";

export async function listKpiDefinitions(request: Request, response: Response, next: NextFunction) {
  try {
    const query = listKpiDefinitionsQuerySchema.parse(request.query);
    response.json(await kpiDefinitionService.list(query));
  } catch (error) { next(error); }
}

export async function getKpiDefinition(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiDefinitionIdParamsSchema.parse(request.params);
    response.json({ data: await kpiDefinitionService.getById(BigInt(id)) });
  } catch (error) { next(error); }
}

export async function listKpiDefinitionConfigurations(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiDefinitionIdParamsSchema.parse(request.params);
    const query = paginationSchema.parse(request.query);
    response.json(await kpiDefinitionService.listConfigurations(BigInt(id), query));
  } catch (error) { next(error); }
}

export async function createKpiDefinition(request: Request, response: Response, next: NextFunction) {
  try {
    const body = createKpiDefinitionBodySchema.parse(request.body);
    const data = await kpiDefinitionService.create(body, request.identity.actorUserId);
    response.status(201).json({ data });
  } catch (error) { next(error); }
}

export async function updateKpiDefinition(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiDefinitionIdParamsSchema.parse(request.params);
    const body = updateKpiDefinitionBodySchema.parse(request.body);
    response.json({ data: await kpiDefinitionService.update(BigInt(id), body, request.identity.actorUserId) });
  } catch (error) { next(error); }
}

export async function deleteKpiDefinition(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = kpiDefinitionIdParamsSchema.parse(request.params);
    response.json({ data: await kpiDefinitionService.softDelete(BigInt(id), request.identity.actorUserId) });
  } catch (error) { next(error); }
}

async function setKpiDefinitionActive(request: Request, response: Response, next: NextFunction, active: boolean) {
  try {
    const { id } = kpiDefinitionIdParamsSchema.parse(request.params);
    response.json({ data: await kpiDefinitionService.setActive(BigInt(id), active, request.identity.actorUserId) });
  } catch (error) { next(error); }
}

export function activateKpiDefinition(request: Request, response: Response, next: NextFunction) {
  return setKpiDefinitionActive(request, response, next, true);
}

export function deactivateKpiDefinition(request: Request, response: Response, next: NextFunction) {
  return setKpiDefinitionActive(request, response, next, false);
}

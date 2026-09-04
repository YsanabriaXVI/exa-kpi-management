import type { NextFunction, Request, Response } from "express";
import { catalogIdParamsSchema, catalogUsageParamsSchema, dataSourceBodySchema, measurementUnitBodySchema, subjectTypeBodySchema, subjectTypeCodeParamsSchema, subjectValueBodySchema } from "../schemas/catalog-management.schema.js";
import { catalogManagementService as service } from "../services/catalog-management.service.js";

const actor = (request: Request) => request.identity.actorUserId;
const id = (request: Request) => BigInt(catalogIdParamsSchema.parse(request.params).id);

export async function listSubjectTypes(_req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.listSubjectTypes() }); } catch (error) { next(error); } }
export async function createSubjectType(req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ data: await service.createSubjectType(subjectTypeBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function updateSubjectType(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.updateSubjectType(id(req), subjectTypeBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function toggleSubjectType(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.toggleSubjectType(id(req), actor(req)) }); } catch (error) { next(error); } }
export async function listSubjectValues(req: Request, res: Response, next: NextFunction) { try { const { code } = subjectTypeCodeParamsSchema.parse(req.params); res.json({ data: await service.listSubjectValues(code) }); } catch (error) { next(error); } }
export async function createSubjectValue(req: Request, res: Response, next: NextFunction) { try { const { code } = subjectTypeCodeParamsSchema.parse(req.params); res.status(201).json({ data: await service.createSubjectValue(code, subjectValueBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function updateSubjectValue(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.updateSubjectValue(id(req), subjectValueBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function toggleSubjectValue(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.toggleSubjectValue(id(req), actor(req)) }); } catch (error) { next(error); } }
export async function listMeasurementUnits(_req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.listMeasurementUnits() }); } catch (error) { next(error); } }
export async function createMeasurementUnit(req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ data: await service.createMeasurementUnit(measurementUnitBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function updateMeasurementUnit(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.updateMeasurementUnit(id(req), measurementUnitBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function toggleMeasurementUnit(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.toggleMeasurementUnit(id(req), actor(req)) }); } catch (error) { next(error); } }
export async function listDataSources(_req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.listDataSources() }); } catch (error) { next(error); } }
export async function createDataSource(req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ data: await service.createDataSource(dataSourceBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function updateDataSource(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.updateDataSource(id(req), dataSourceBodySchema.parse(req.body), actor(req)) }); } catch (error) { next(error); } }
export async function toggleDataSource(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await service.toggleDataSource(id(req), actor(req)) }); } catch (error) { next(error); } }
export async function catalogUsage(req: Request, res: Response, next: NextFunction) { try { const { kind, id } = catalogUsageParamsSchema.parse(req.params); res.json({ data: await service.usage(kind, id) }); } catch (error) { next(error); } }

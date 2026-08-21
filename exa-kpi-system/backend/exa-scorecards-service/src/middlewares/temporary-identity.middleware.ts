import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
export function temporaryIdentityMiddleware(request: Request, _response: Response, next: NextFunction): void { request.identity = { actorUserId: env.TEMPORARY_ACTOR_USER_ID }; next(); }

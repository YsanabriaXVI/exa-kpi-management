import type { RequestHandler } from "express";
import { env } from "../config/env.js";

// Temporary seam: replace this middleware with EXA/JWT identity resolution later.
// No public header is trusted and the domain remains unaware of authentication details.
export const temporaryIdentity: RequestHandler = (request, _response, next) => {
  request.identity = {
    actorUserId: env.TEMPORARY_ACTOR_USER_ID ? BigInt(env.TEMPORARY_ACTOR_USER_ID) : null,
    source: "temporary-environment",
  };
  next();
};

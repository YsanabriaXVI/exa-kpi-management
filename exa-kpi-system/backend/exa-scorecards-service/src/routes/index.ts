import { Router } from "express";
import { scorecardRouter } from "./scorecard.routes.js";
export const apiRouter = Router();
apiRouter.use("/v1/scorecards", scorecardRouter);

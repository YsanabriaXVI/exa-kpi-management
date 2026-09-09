import { closureRecoveryRouter } from "./closure-recovery.routes.js";
import { Router } from "express"; import { monitoringPeriodRouter } from "./monitoring-period.routes.js"; export const apiRouter=Router(); apiRouter.use("/v1/monitoring-periods/internal/closure",closureRecoveryRouter); apiRouter.use("/v1/monitoring-periods",monitoringPeriodRouter);

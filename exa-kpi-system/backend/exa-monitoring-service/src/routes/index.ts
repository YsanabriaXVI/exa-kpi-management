import { closureRecoveryRouter } from "./closure-recovery.routes.js";
import { closedResultsRouter } from "./closed-results.routes.js";
import { Router } from "express"; import { monitoringPeriodRouter } from "./monitoring-period.routes.js"; export const apiRouter=Router(); apiRouter.use("/v1/monitoring-periods/internal/closure",closureRecoveryRouter); apiRouter.use("/v1/monitoring-periods",monitoringPeriodRouter);
apiRouter.use("/v1/closed-results", closedResultsRouter);

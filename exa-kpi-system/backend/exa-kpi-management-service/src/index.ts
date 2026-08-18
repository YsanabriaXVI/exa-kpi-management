import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { registerTerminationHandlers } from "./terminate.js";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "EXA KPI Management service started");
});

registerTerminationHandlers(server);

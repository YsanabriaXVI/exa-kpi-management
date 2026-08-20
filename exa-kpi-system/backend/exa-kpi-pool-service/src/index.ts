import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { natsManager } from "./config/nats.js";
import { outboxProcessor } from "./outbox/outbox.processor.js";
import { registerTerminationHandlers } from "./terminate.js";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "EXA KPI Pool Service listening");
});

registerTerminationHandlers(server);
void natsManager.start().then(() => outboxProcessor.start());

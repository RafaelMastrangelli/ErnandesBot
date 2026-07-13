import { createApp } from "./src/app.js";
import { createLogger } from "./src/common/logger.js";
import { env } from "./src/config/env.js";
import { createRabbitMQPublisher } from "./src/queue/rabbitmq-queue.js";

const logger = createLogger("api");
const queue = await createRabbitMQPublisher({ logger });

const app = createApp({
  queue,
  logger
});

app.listen(env.port, env.host, () => {
  logger.info(`AI Doc Agent API rodando em ${env.host}:${env.port}`);
});

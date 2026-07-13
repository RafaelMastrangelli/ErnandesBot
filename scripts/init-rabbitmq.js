import { createLogger } from "../src/common/logger.js";
import { env } from "../src/config/env.js";
import { initRabbitMQTopology } from "../src/queue/rabbitmq-topology.js";

const logger = createLogger("rabbitmq-init");

await initRabbitMQTopology({
  url: env.rabbitmqUrl,
  logger
});

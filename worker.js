import { createLogger } from "./src/common/logger.js";
import { startWorker } from "./src/modules/processing/worker.service.js";
import { createRabbitMQConsumer } from "./src/queue/rabbitmq-queue.js";

const logger = createLogger("worker");
const consumer = await createRabbitMQConsumer({ logger });

await startWorker({ consumer, logger });

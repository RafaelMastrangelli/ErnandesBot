import { createApp } from "./src/app.js";
import { createLogger } from "./src/common/logger.js";
import { env } from "./src/config/env.js";
import { startWorker } from "./src/modules/processing/worker.service.js";
import { createInMemoryQueue } from "./src/queue/in-memory-queue.js";

const logger = createLogger("bootstrap");
const queue = createInMemoryQueue({
  maxSize: env.maxQueueSize
});

startWorker({
  queue,
  logger
});

const app = createApp({
  queue,
  logger
});

app.listen(env.port, env.host, () => {
  logger.info(`AI Doc Agent rodando em ${env.host}:${env.port}`);
});

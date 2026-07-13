import { env } from "../config/env.js";
import { connectWithRetry, attachConnectionListeners } from "./rabbitmq-connection.js";

export async function assertRabbitMQTopology(channel) {
  await channel.assertExchange(env.rabbitmqDeadLetterExchange, "direct", {
    durable: true
  });

  await channel.assertQueue(env.rabbitmqDeadLetterQueue, {
    durable: true
  });

  await channel.bindQueue(
    env.rabbitmqDeadLetterQueue,
    env.rabbitmqDeadLetterExchange,
    env.rabbitmqDeadLetterRoutingKey
  );

  await channel.assertQueue(env.rabbitmqQueue, {
    durable: true,
    maxLength: env.maxQueueSize,
    overflow: "reject-publish",
    deadLetterExchange: env.rabbitmqDeadLetterExchange,
    deadLetterRoutingKey: env.rabbitmqDeadLetterRoutingKey
  });
}

export async function initRabbitMQTopology({ url, logger }) {
  const connection = await connectWithRetry(url, logger);
  attachConnectionListeners(connection, logger, "init");

  const channel = await connection.createChannel();
  await assertRabbitMQTopology(channel);

  await channel.close();
  await connection.close();

  logger.info("Topologia RabbitMQ inicializada", {
    queue: env.rabbitmqQueue,
    deadLetterQueue: env.rabbitmqDeadLetterQueue
  });
}

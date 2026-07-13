import { env } from "../config/env.js";
import {
  attachConnectionListeners,
  connectWithRetry
} from "./rabbitmq-connection.js";

/**
 * @param {{ logger: import("../common/logger.js").Logger }} params
 * @returns {Promise<import("./queue.contract.js").QueuePublisher>}
 */
export async function createRabbitMQPublisher({ logger }) {
  const connection = await connectWithRetry(env.rabbitmqUrl, logger);
  attachConnectionListeners(connection, logger, "publisher");

  const channel = await connection.createChannel();

  return {
    async publish(event) {
      const payload = Buffer.from(JSON.stringify(event));

      return channel.sendToQueue(env.rabbitmqQueue, payload, {
        persistent: true,
        contentType: "application/json"
      });
    },

    async close() {
      await channel.close();
      await connection.close();
    }
  };
}

/**
 * @param {{ logger: import("../common/logger.js").Logger }} params
 * @returns {Promise<import("./queue.contract.js").QueueConsumer>}
 */
export async function createRabbitMQConsumer({ logger }) {
  const connection = await connectWithRetry(env.rabbitmqUrl, logger);
  attachConnectionListeners(connection, logger, "consumer");

  const channel = await connection.createChannel();
  await channel.prefetch(1);

  return {
    async consume(handler) {
      await channel.consume(env.rabbitmqQueue, async message => {
        if (!message) return;

        let event;

        try {
          event = JSON.parse(message.content.toString());
        } catch (error) {
          logger.error("Mensagem invalida na fila", {
            message: error?.message || "Erro desconhecido"
          });
          channel.nack(message, false, false);
          return;
        }

        const ack = () => channel.ack(message);
        const nack = (requeue = false) => channel.nack(message, false, requeue);
        const republish = async nextEvent => {
          const payload = Buffer.from(JSON.stringify(nextEvent));
          channel.sendToQueue(env.rabbitmqQueue, payload, {
            persistent: true,
            contentType: "application/json"
          });
        };

        await handler(event, { ack, nack, republish });
      });
    },

    async close() {
      await channel.close();
      await connection.close();
    }
  };
}

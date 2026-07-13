import amqp from "amqplib";

const RECONNECT_DELAY_MS = 5000;

export async function connectWithRetry(url, logger) {
  while (true) {
    try {
      const connection = await amqp.connect(url);
      logger.info("Conectado ao RabbitMQ");
      return connection;
    } catch (error) {
      logger.warn("Falha ao conectar no RabbitMQ. Tentando novamente...", {
        message: error?.message || "Erro desconhecido"
      });
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
    }
  }
}

export function attachConnectionListeners(connection, logger, role) {
  connection.on("close", () => {
    logger.error(`Conexao com RabbitMQ encerrada (${role})`);
  });

  connection.on("error", error => {
    logger.error(`Erro na conexao RabbitMQ (${role})`, {
      message: error?.message || "Erro desconhecido"
    });
  });
}

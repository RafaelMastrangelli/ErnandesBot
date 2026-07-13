import express from "express";

import { env } from "../../config/env.js";
import { getWebhookHandler } from "./webhook.handler.js";

export function createWebhookRouter({ queue, logger }) {
  const router = express.Router();
  const webhookHandler = getWebhookHandler();

  router.post("/webhook", async (req, res) => {
    if (!webhookHandler.validateRequest(req)) {
      logger.info("Evento ignorado por header invalido", {
        gitProvider: webhookHandler.provider
      });
      return res.sendStatus(200);
    }

    const eventData = webhookHandler.mapPushEvent(req.body);

    if (!eventData?.owner || !eventData?.repo || !eventData?.branch) {
      logger.warn("Payload de push invalido para processamento", {
        gitProvider: webhookHandler.provider
      });
      return res.sendStatus(200);
    }

    try {
      const published = await queue.publish(eventData);

      if (!published) {
        logger.warn("Fila cheia. Evento rejeitado para retry do provider", {
          queue: env.rabbitmqQueue
        });
        return res.sendStatus(503);
      }

      logger.info("Evento publicado na fila", {
        gitProvider: eventData.gitProvider,
        owner: eventData.owner,
        repo: eventData.repo,
        branch: eventData.branch,
        queue: env.rabbitmqQueue
      });

      return res.sendStatus(200);
    } catch (error) {
      logger.error("Falha ao publicar evento na fila", {
        message: error?.message || "Erro desconhecido",
        gitProvider: eventData.gitProvider,
        owner: eventData.owner,
        repo: eventData.repo,
        branch: eventData.branch
      });
      return res.sendStatus(503);
    }
  });

  return router;
}

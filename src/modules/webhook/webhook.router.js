import express from "express";

import { env } from "../../config/env.js";
import { mapPushEvent } from "./webhook.mapper.js";

export function createWebhookRouter({ queue, logger }) {
  const router = express.Router();

  router.post("/webhook", (req, res) => {
    const eventKey = req.headers["x-event-key"];

    if (eventKey !== env.webhookEventKey) {
      logger.info("Evento ignorado por chave diferente", { eventKey });
      return res.sendStatus(200);
    }

    const eventData = mapPushEvent(req.body);

    if (!eventData?.workspace || !eventData?.repo || !eventData?.branch) {
      logger.warn("Payload de push invalido para processamento");
      return res.sendStatus(200);
    }

    const enqueued = queue.enqueue(eventData);

    if (!enqueued) {
      logger.warn("Fila cheia. Evento rejeitado para retry do provider", {
        queueSize: queue.size()
      });
      return res.sendStatus(503);
    }

    logger.info("Evento enfileirado", {
      repo: eventData.repo,
      branch: eventData.branch,
      queueSize: queue.size()
    });

    return res.sendStatus(200);
  });

  return router;
}

import express from "express";

import { env } from "./config/env.js";
import { createWebhookRouter } from "./modules/webhook/webhook.router.js";

export function createApp({ queue, logger }) {
  const app = express();

  app.use(express.json({ limit: env.jsonBodyLimit }));

  app.use(
    createWebhookRouter({
      queue,
      logger
    })
  );

  app.get("/health", (_req, res) => {
    res.status(200).send("OK");
  });

  return app;
}

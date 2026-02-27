import express from "express";
import { startWorker } from "./src/worker.js";

const app = express();
app.use(express.json());

/*
 * FILA EM MEMÓRIA
 */
const queue = [];

startWorker(queue);

/*
 * WEBHOOK RECEIVER
 */
app.post("/webhook", (req, res) => {
  const eventKey = req.headers["x-event-key"];

  if (eventKey !== "repo:push") {
    console.log("Evento ignorado:", eventKey);
    return res.sendStatus(200);
  }

  const payload = req.body;
  const change = payload.push?.changes?.[0];

  if (!change?.new) {
    console.log("Push sem branch nova. Ignorado.");
    return res.sendStatus(200);
  }

  const eventData = {
    workspace: payload.repository?.workspace?.slug,
    repo: payload.repository?.full_name.split("/")[1],
    branch: change.new.name,
    oldHash: change.old?.target?.hash,
    newHash: change.new.target.hash
  };

  console.log("Evento estruturado:", eventData);

  queue.push(eventData);
  console.log("Evento enfileirado. Fila atual:", queue.length);

  res.sendStatus(200);
});

/*
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.send("OK");
});

/*
 * START SERVER
 */
app.listen(3005, "0.0.0.0", () => {
  console.log("AI Doc Agent rodando na porta 3005");
});

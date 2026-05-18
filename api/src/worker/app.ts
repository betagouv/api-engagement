import errorHandler from "@/middlewares/error-handler";
import requestId from "@/middlewares/request-id";
import { taskRegistry } from "@/worker/registry";
import { taskEnvelopeSchema } from "@/worker/types";
import express from "express";
import { z } from "zod";

export const buildAsyncWorkerApp = () => {
  const app = express();

  app.use(express.json({ limit: "1mb", type: "*/*" }));
  app.use(requestId);

  app.get("/", (_req, res) => {
    res.status(200).send({ ok: true, service: "async-worker" });
  });

  app.post("/", async (req, res, next) => {
    try {
      const envelope = taskEnvelopeSchema.parse(req.body);
      const entry = taskRegistry[envelope.type as keyof typeof taskRegistry];

      if (!entry) {
        console.error("[async-worker] unknown task type", { type: envelope.type });
        return res.status(400).send({ ok: false, message: "Unknown task type" });
      }

      const payload = entry.schema.parse(envelope.payload);

      await entry.handler(payload);

      console.log(`[async-worker] handler ${entry.handler.name} processed`);

      return res.status(200).send({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[async-worker] invalid message", { issues: error.issues });
        return res.status(400).send({ ok: false, message: "Invalid message" });
      }

      return next(error);
    }
  });

  app.use(errorHandler);

  return app;
};

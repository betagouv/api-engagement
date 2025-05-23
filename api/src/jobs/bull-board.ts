import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import express from "express";
import { jobConfigs } from "./config";

/**
 * Configure Bull Board for monitoring queues from job configs
 * @param app Express application
 * @param basePath Base path for Bull Board
 */
export function setupBullBoard(app: express.Application, { basePath = "/admin/queues" } = {}) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  const queueInstances = Object.values(jobConfigs).map((config) => config.queue);

  createBullBoard({
    queues: queueInstances.map((queue) => new BullMQAdapter(queue.getQueue())),
    serverAdapter,
  });

  app.use(basePath, serverAdapter.getRouter());

  return {
    serverAdapter,
  };
}

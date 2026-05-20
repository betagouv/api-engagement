import dotenv from "dotenv";
dotenv.config();

import { IMAGE_VERSION, PORT_WORKER } from "@/config";
import { pgConnected, pgDisconnect } from "@/db/postgres";
import { buildAsyncWorkerApp } from "@/worker/app";

const main = async () => {
  await pgConnected();

  const app = buildAsyncWorkerApp();
  const port = Number(PORT_WORKER);

  const server = app.listen(port, () => {
    console.log(`[async-worker] Running on ${port} (image version: ${IMAGE_VERSION})`);
  });

  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pgDisconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
};

main().catch(async (error) => {
  console.error("[async-worker] fatal error", error);
  await pgDisconnect();
  process.exit(1);
});

import dotenv from "dotenv";
dotenv.config();

import { PORT_WORKER } from "@/config";
import { pgConnected, pgDisconnect } from "@/db/postgres";
import { buildAsyncWorkerApp } from "@/worker/app";

const main = async () => {
  await pgConnected();

  const app = buildAsyncWorkerApp();
  const port = Number(PORT_WORKER || 8080);

  const server = app.listen(port, () => {
    console.log(`[async-worker] listening on ${port}`);
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

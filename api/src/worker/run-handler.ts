import dotenv from "dotenv";
dotenv.config();

import { pgConnected, pgDisconnect } from "@/db/postgres";
import { taskRegistry } from "@/worker/registry";
import { z } from "zod";

const main = async () => {
  const [, , type, rawPayload] = process.argv;

  if (!type || !rawPayload) {
    console.error("Usage: ts-node src/worker/run-handler.ts <type> '<json-payload>'");
    console.error("Example: ts-node src/worker/run-handler.ts mission.enrichment '{\"missionId\":\"abc123\"}'");
    console.error("\nTypes disponibles :", Object.keys(taskRegistry).join(", "));
    process.exit(1);
  }

  const entry = taskRegistry[type];
  if (!entry) {
    console.error(`[run-handler] Type inconnu : "${type}"`);
    console.error("Types disponibles :", Object.keys(taskRegistry).join(", "));
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    console.error("[run-handler] Payload JSON invalide :", rawPayload);
    process.exit(1);
  }

  let payload: unknown;
  try {
    payload = entry.schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[run-handler] Payload invalide :", JSON.stringify(error.issues, null, 2));
    } else {
      console.error("[run-handler] Erreur de validation :", error);
    }
    process.exit(1);
  }

  await pgConnected();
  console.log(`[run-handler] Exécution du handler pour "${type}"...`);

  try {
    await entry.handler(payload);
    console.log(`[run-handler] Handler "${type}" terminé.`);
  } finally {
    await pgDisconnect();
  }
};

main().catch(async (error) => {
  console.error("[run-handler] Erreur fatale :", error);
  await pgDisconnect();
  process.exit(1);
});

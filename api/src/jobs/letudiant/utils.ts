// Utility functions for letudiant job sync
import { setTimeout as sleep } from "timers/promises";
import MissionModel from "../../models/mission";

/**
 * Check if a mission is already synced to Piloty (idempotence)
 */
export function isAlreadySynced(mission: any): boolean {
  return Boolean(mission.letudiantPublicId);
}

/**
 * Simple rate limiter: wait for a fixed delay (ms)
 */
export async function rateLimit(delayMs = 1000) {
  await sleep(delayMs);
}

/**
 * Get missions created or updated since the last sync
 * TODO: get last sync date from DB
 */
export async function getMissionsToSync(id?: string) {
  const query: any = {
    deletedAt: null,
    statusCode: "ACCEPTED",
  };

  if (id) {
    query._id = id;
  }
  return MissionModel.find(query).sort({ createdAt: "asc" }).lean();
}

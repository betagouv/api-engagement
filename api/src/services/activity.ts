import { activityRepository } from "../repositories/activity";
import { missionActivityRepository } from "../repositories/mission-activity";
import { isWhitelistedActivity, splitActivityString } from "../utils/activity";

const DEFAULT_ACTIVITY_NAME = "Autre";

export const activityService = {
  /**
   * Import pipeline : split → slugify → whitelist check → fallback "Autre".
   * Unknown activities (slug inconnu après normalisation) sont remplacés par "Autre".
   * Les doublons sont supprimés (y compris les "Autre" multiples).
   */
  resolveImportedActivities(raw: string): string[] {
    const parsed = splitActivityString(raw);
    const resolved = parsed.map((name) => (isWhitelistedActivity(name) ? name : DEFAULT_ACTIVITY_NAME));
    return [...new Set(resolved)];
  },

  /**
   * Resolves activity names to IDs, creating missing activities as needed.
   */
  async getOrCreateActivities(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      const existing = await activityRepository.findUnique({ where: { name }, select: { id: true } });
      if (existing) {
        ids.push(existing.id);
      } else {
        const created = await activityRepository.create({ name });
        ids.push(created.id);
      }
    }
    return ids;
  },

  async addMissionActivities(missionId: string, activityIds: string[]): Promise<void> {
    if (!activityIds.length) {
      return;
    }
    await missionActivityRepository.createMany(activityIds.map((activityId) => ({ missionId, activityId })));
  },

  async replaceMissionActivities(missionId: string, activityIds: string[]): Promise<void> {
    await missionActivityRepository.deleteByMissionId(missionId);
    await this.addMissionActivities(missionId, activityIds);
  },
};

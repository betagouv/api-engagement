import { Prisma } from "@/db/core";
import { activityRepository } from "@/repositories/activity";
import { missionActivityRepository } from "@/repositories/mission-activity";
import { isWhitelistedActivity, splitActivityString } from "@/utils/activity";

const DEFAULT_ACTIVITY_NAME = "Autre";

export const activityService = {
  /**
   * Parse activities from string, based on whitelisted labels
   * Pipeline:
   * 1. Split to ,
   * 2. slugify
   * 3. whitelist check (based on slug)
   * 4. fallback to "Autre".
   * Duplicated data is removed.
   */
  resolveImportedActivities(raw: string): string[] {
    const parsed = splitActivityString(raw);
    const resolved = parsed.map((name) => (isWhitelistedActivity(name) ? name : DEFAULT_ACTIVITY_NAME));
    return [...new Set(resolved)];
  },

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

  async aggregateByMission(missionWhere: Prisma.MissionWhereInput): Promise<Array<{ key: string; doc_count: number }>> {
    const rows = await missionActivityRepository.groupBy(["activityId"], { mission: missionWhere });

    const ids = rows.map((row) => row.activityId).filter((id): id is string => !!id);
    const activities = ids.length ? await activityRepository.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nameById = new Map(activities.map((a) => [a.id, a.name]));

    return rows
      .map((row) => ({ key: nameById.get(row.activityId) ?? "", doc_count: row._count }))
      .filter((row) => row.key !== "")
      .sort((a, b) => b.doc_count - a.doc_count);
  },
};

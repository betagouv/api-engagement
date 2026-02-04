import { prismaCore } from "../db/postgres";
import { isWhitelistedActivity, splitActivityString } from "../utils/activity";

export const activityService = {
  /**
   * Import pipeline : split → slugify → whitelist check → fallback "Autre".
   * Unknown activities (slug inconnu après normalisation) sont remplacés par "Autre".
   * Les doublons sont supprimés (y compris les "Autre" multiples).
   */
  resolveImportedActivities(raw: string): string[] {
    const parsed = splitActivityString(raw);
    const resolved = parsed.map((name) => (isWhitelistedActivity(name) ? name : "Autre"));
    return [...new Set(resolved)];
  },

  /**
   * Resolves activity names to IDs, creating missing activities as needed.
   */
  async resolveNames(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      const existing = await prismaCore.activity.findUnique({ where: { name }, select: { id: true } });
      if (existing) {
        ids.push(existing.id);
      } else {
        const created = await prismaCore.activity.create({ data: { name } });
        ids.push(created.id);
      }
    }
    return ids;
  },
};

import { prismaCore } from "../db/postgres";
import { splitActivityString } from "../utils/activity";

export const activityService = {
  /**
   * Parses a raw comma-separated activity string into individual activity names,
   * preserving compound activities as atomic units.
   */
  parseActivityString(raw: string): string[] {
    return splitActivityString(raw);
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

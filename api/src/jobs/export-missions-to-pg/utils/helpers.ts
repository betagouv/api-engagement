import prisma from "../../../db/postgres";
import MissionModel from "../../../models/mission";
import { Mission } from "../../../types";

const DEFAULT_LIMIT = 10000;

export const countMongoMissionsToSync = async (): Promise<number> => {
  return MissionModel.countDocuments({
    $or: [{ lastExportedToPgAt: { $exists: false } }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }],
  });
};

/**
 * Get MongoDB missions where updated at is greater than the last time they were exported (mission.updatedAt > mission.lastExportedToPgAt)
 *
 * @param payload The job payload
 * @returns The missions to sync
 */
export const getMongoMissionsToSync = async ({ limit, offset }: { limit: number; offset: number }): Promise<Mission[]> => {
  return MissionModel.find({
    $or: [{ lastExportedToPgAt: { $exists: false } }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }],
  })
    .limit(limit || DEFAULT_LIMIT)
    .skip(offset || 0)
    .lean();
};

/**
 * Get PG organizations from missions
 * Extract unique organization IDs from selected missions to find only wanted organizations in PG
 *
 * @param missions The missions to get organizations from
 * @returns The organizations
 */
export const getOrganizationsFromMissions = async (missions: Mission[]) => {
  const organizationIds: string[] = [...new Set(missions.map((e) => e.organizationId).filter((e) => e !== undefined))] as string[];
  const organizations = {} as { [key: string]: string };
  await prisma.organization
    .findMany({
      where: { old_id: { in: organizationIds } },
      select: { id: true, old_id: true },
    })
    .then((data) => data.forEach((d) => (organizations[d.old_id] = d.id)));

  return organizations;
};

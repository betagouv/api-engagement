import prisma from "../../../db/postgres";
import MissionModel from "../../../models/mission";
import { Mission } from "../../../types";
import { ExportMissionsToPgJobPayload } from "../types";

const DEFAULT_LIMIT = 10000;

/**
 * Get MongoDB missions where updated at is greater than the last time they were exported (mission.updatedAt > mission.lastExportedToPgAt)
 *
 * @param payload The job payload
 * @returns The missions to sync
 */
export const getMongoMissionsToSync = async (payload: ExportMissionsToPgJobPayload): Promise<Mission[]> => {
  return MissionModel.find({
    $or: [{ lastExportedToPgAt: { $exists: false } }, { $expr: { $lt: ["$lastExportedToPgAt", "$updatedAt"] } }],
  })
    .limit(payload.limit || DEFAULT_LIMIT)
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
  const organizations = await prisma.organization.findMany({
    where: { old_id: { in: organizationIds } },
  });

  return organizations;
};

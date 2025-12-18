import { prismaAnalytics as prisma, prismaCore } from "../../../db/postgres";
import { missionService } from "../../../services/mission";
import { MissionRecord } from "../../../types/mission";

const DEFAULT_LIMIT = 10000;

export const countMongoMissionsToSync = async (): Promise<number> => {
  const result = await prismaCore.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mission
    WHERE last_exported_to_pg_at IS NULL OR last_exported_to_pg_at < updated_at
  `;
  const count = result?.[0]?.count ?? 0n;
  return Number(count);
};

/**
 * Get MongoDB missions where updated at is greater than the last time they were exported (mission.updatedAt > mission.lastExportedToPgAt)
 *
 * @param payload The job payload
 * @returns The missions to sync
 */
export const getMongoMissionsToSync = async ({ limit }: { limit: number }): Promise<MissionRecord[]> => {
  const rows = await prismaCore.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM mission
    WHERE last_exported_to_pg_at IS NULL OR last_exported_to_pg_at < updated_at
    ORDER BY updated_at ASC
    LIMIT ${limit || DEFAULT_LIMIT}
  `;
  const ids = rows.map((row) => row.id);
  if (!ids.length) {
    return [];
  }

  const missions = await missionService.findMissionsBy({ id: { in: ids } }, { orderBy: { updatedAt: "asc" } });

  const missionById = new Map(missions.map((m) => [m.id, m]));
  return ids.map((id) => missionById.get(id)).filter((m): m is MissionRecord => Boolean(m));
};

/**
 * Get PG organizations from missions
 * Extract unique organization IDs from selected missions to find only wanted organizations in PG
 *
 * @param missions The missions to get organizations from
 * @returns The organizations
 */
export const getOrganizationsFromMissions = async (missions: MissionRecord[]) => {
  const organizationIds = [...new Set(missions.map((e) => e.organizationId).filter((id): id is string => id !== null && id !== undefined))];
  const organizations = {} as { [key: string]: string };

  await prisma.organization
    .findMany({
      where: { old_id: { in: organizationIds } },
      select: { id: true, old_id: true },
    })
    .then((data) => data.forEach((d) => (organizations[d.old_id] = d.id)));

  return organizations;
};

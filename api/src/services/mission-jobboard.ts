import { JobBoardId, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { missionJobBoardRepository } from "../repositories/mission-job-board";
import { MissionJobBoardRecord, MissionJobBoardSyncStatus, MissionJobBoardUpsertInput } from "../types/mission-job-board";

const mapRecord = (entry: any): MissionJobBoardRecord => ({
  id: entry.id,
  jobBoardId: entry.jobBoardId,
  missionId: entry.missionId,
  missionAddressId: entry.missionAddressId,
  publicId: entry.publicId,
  status: entry.status ?? null,
  syncStatus: entry.syncStatus ?? null,
  comment: entry.comment ?? null,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

export const missionJobBoardService = {
  async findByJobBoardAndMissionIds(jobBoardId: JobBoardId, missionIds: string[]): Promise<MissionJobBoardRecord[]> {
    const entries = await missionJobBoardRepository.findByJobBoardAndMissionIds(jobBoardId, missionIds);
    return entries.map(mapRecord);
  },

  async findByJobBoard(jobBoardId: JobBoardId, syncStatus?: string): Promise<MissionJobBoardRecord[]> {
    const entries = await missionJobBoardRepository.findByJobBoard(jobBoardId, syncStatus as MissionJobBoardSyncStatus);
    return entries.map(mapRecord);
  },

  async findMissionIdsToSync(params: { jobBoardId: JobBoardId; publisherIds: string[]; republishingDate: Date; limit: number }): Promise<{ total: number; ids: string[] }> {
    const { jobBoardId, publisherIds, republishingDate, limit } = params;
    if (!publisherIds.length || limit <= 0) {
      return { total: 0, ids: [] };
    }

    const rows = await prismaCore.$queryRaw<Array<{ id: string; total: bigint }>>(
      Prisma.sql`
        SELECT m.id, COUNT(*) OVER()::bigint AS total
        FROM mission m
        LEFT JOIN (
          SELECT mission_id, MAX(updated_at) AS last_synced_at
          FROM mission_jobboard
          WHERE jobboard_id = ${jobBoardId}::"JobBoardId"
          GROUP BY mission_id
        ) mjb ON mjb.mission_id = m.id
        WHERE m.publisher_id IN (${Prisma.join(publisherIds)})
          AND m.organization_id IS NOT NULL
          AND m.organization_id ~ '^[0-9a-fA-F]{24}$'
          AND NOT EXISTS (
            SELECT 1
            FROM mission_jobboard mjb_err
            WHERE mjb_err.mission_id = m.id
              AND mjb_err.jobboard_id = ${jobBoardId}::"JobBoardId"
              AND mjb_err.sync_status = 'ERROR'::"MissionJobBoardSyncStatus"
          )
          AND (
            (
              m.deleted_at IS NULL
              AND m.status_code = 'ACCEPTED'
              AND (
                mjb.last_synced_at IS NULL
                OR mjb.last_synced_at < m.updated_at
                OR mjb.last_synced_at < ${republishingDate}
              )
            )
            OR (
              m.deleted_at IS NOT NULL
              AND mjb.last_synced_at IS NOT NULL
              AND m.deleted_at > mjb.last_synced_at
            )
            OR (
              m.status_code <> 'ACCEPTED'
              AND mjb.last_synced_at IS NOT NULL
              AND m.updated_at > mjb.last_synced_at
            )
          )
        ORDER BY m.updated_at DESC
        LIMIT ${limit}
      `
    );

    return {
      total: Number(rows[0]?.total ?? 0),
      ids: rows.map((row) => row.id),
    };
  },

  async replaceForMission(jobBoardId: JobBoardId, missionId: string, entries: Array<Omit<MissionJobBoardUpsertInput, "jobBoardId" | "missionId">>): Promise<void> {
    const payload = entries.map((entry) => ({
      jobBoardId,
      missionId,
      missionAddressId: entry.missionAddressId ?? null,
      publicId: entry.publicId,
      status: entry.status ?? null,
      syncStatus: entry.syncStatus ?? null,
      comment: entry.comment ?? null,
    }));

    if (!payload.length) {
      return;
    }

    await Promise.all(payload.map((entry) => missionJobBoardRepository.upsert(entry)));
  },

  async upsert(entry: MissionJobBoardUpsertInput): Promise<MissionJobBoardRecord> {
    const record = await missionJobBoardRepository.upsert(entry);
    return mapRecord(record);
  },
};

export default missionJobBoardService;

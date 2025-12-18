import { JobBoardId } from "../db/core";
import { missionJobBoardRepository } from "../repositories/mission-job-board";
import { MissionJobBoardRecord, MissionJobBoardUpsertInput } from "../types/mission-job-board";

const mapRecord = (entry: any): MissionJobBoardRecord => ({
  id: entry.id,
  jobBoardId: entry.jobBoardId,
  missionId: entry.missionId,
  missionAddressId: entry.missionAddressId,
  publicId: entry.publicId,
  status: entry.status ?? null,
  comment: entry.comment ?? null,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

export const missionJobBoardService = {
  async findByJobBoardAndMissionIds(jobBoardId: JobBoardId, missionIds: string[]): Promise<MissionJobBoardRecord[]> {
    const entries = await missionJobBoardRepository.findByJobBoardAndMissionIds(jobBoardId, missionIds);
    return entries.map(mapRecord);
  },

  async findByJobBoard(jobBoardId: JobBoardId, status?: string): Promise<MissionJobBoardRecord[]> {
    const entries = await missionJobBoardRepository.findByJobBoard(jobBoardId, status);
    return entries.map(mapRecord);
  },

  async replaceForMission(jobBoardId: JobBoardId, missionId: string, entries: Array<Omit<MissionJobBoardUpsertInput, "jobBoardId" | "missionId">>): Promise<void> {
    const payload = entries.map((entry) => ({
      jobBoardId,
      missionId,
      missionAddressId: entry.missionAddressId ?? null,
      publicId: entry.publicId,
      status: entry.status ?? null,
      comment: entry.comment ?? null,
    }));

    await missionJobBoardRepository.deleteForMission(jobBoardId, missionId);
    if (payload.length) {
      await missionJobBoardRepository.createMany(payload);
    }
  },

  async upsert(entry: MissionJobBoardUpsertInput): Promise<MissionJobBoardRecord> {
    const record = await missionJobBoardRepository.upsert(entry);
    return mapRecord(record);
  },
};

export default missionJobBoardService;

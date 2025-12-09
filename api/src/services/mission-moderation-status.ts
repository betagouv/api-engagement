import { missionModerationStatusRepository } from "../repositories/mission-moderation-status";
import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

type ModerationStatusInput = Pick<Prisma.MissionModerationStatusCreateInput, "mission" | "publisher" | "status" | "comment" | "note" | "title">;

export const missionModerationStatusService = {
  async upsertStatus(missionId: string, publisherId: string, data: Omit<ModerationStatusInput, "mission" | "publisher">) {
    return missionModerationStatusRepository.upsert(
      { missionId_publisherId: { missionId, publisherId } },
      {
        mission: { connect: { id: missionId } },
        publisher: { connect: { id: publisherId } },
        status: data.status ?? null,
        comment: data.comment ?? null,
        note: data.note ?? null,
        title: data.title ?? null,
      }
    );
  },

  async upsertStatuses(
    inputs: Array<{ missionId: string; publisherId: string; status: string | null; comment: string | null; note: string | null; title?: string | null }>
  ) {
    if (!inputs.length) {
      return [];
    }
    return prismaCore.$transaction(
      inputs.map((input) =>
        missionModerationStatusRepository.upsert(
          { missionId_publisherId: { missionId: input.missionId, publisherId: input.publisherId } },
          {
            mission: { connect: { id: input.missionId } },
            publisher: { connect: { id: input.publisherId } },
            status: input.status ?? null,
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          }
        )
      )
    );
  },
};

export default missionModerationStatusService;

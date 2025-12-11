import { Prisma, ModerationEventStatus } from "../db/core";
import { prismaCore } from "../db/postgres";
import { missionModerationStatusRepository } from "../repositories/mission-moderation-status";

type ModerationStatusInput = Pick<Prisma.MissionModerationStatusCreateInput, "mission" | "publisherId" | "status" | "comment" | "note" | "title">;

export const missionModerationStatusService = {
  async upsertStatus(missionId: string, publisherId: string, data: Omit<ModerationStatusInput, "mission" | "publisherId">) {
    return missionModerationStatusRepository.upsert(
      { missionId_publisherId: { missionId, publisherId } },
      {
        mission: { connect: { id: missionId } },
        publisherId,
        status: (data.status as ModerationEventStatus | null) ?? null,
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
        prismaCore.missionModerationStatus.upsert({
          where: { missionId_publisherId: { missionId: input.missionId, publisherId: input.publisherId } },
          update: {
            status: (input.status as ModerationEventStatus | null) ?? null,
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          },
          create: {
            mission: { connect: { id: input.missionId } },
            publisherId: input.publisherId,
            status: (input.status as ModerationEventStatus | null) ?? null,
            comment: input.comment ?? null,
            note: input.note ?? null,
            title: input.title ?? null,
          },
        })
      )
    );
  },
};

export default missionModerationStatusService;

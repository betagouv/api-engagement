import { Prisma } from "../db/core";
import { missionEventRepository } from "../repositories/mission-event";
import { MissionEventCreateParams, MissionEventRecord } from "../types/mission-event";

const mapChangesToJsonInput = (changes: MissionEventCreateParams["changes"]): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined => {
  if (changes === undefined) {
    return undefined;
  }
  if (changes === null) {
    return Prisma.NullableJsonNullValueInput.DbNull;
  }
  return changes as Prisma.InputJsonValue;
};

const toCreateInput = (event: MissionEventCreateParams): Prisma.MissionEventCreateInput => ({
  missionId: event.missionId,
  type: event.type,
  createdBy: event.createdBy ?? null,
  changes: mapChangesToJsonInput(event.changes),
});

export const missionEventService = {
  async createMissionEvent(event: MissionEventCreateParams): Promise<MissionEventRecord> {
    const data = toCreateInput(event);

    return await missionEventRepository.create(data);
  },

  async createMissionEvents(events: MissionEventCreateParams[]): Promise<number> {
    if (!events.length) {
      return 0;
    }

    const data: Prisma.MissionEventCreateManyInput[] = events.map(toCreateInput);
    const result = await missionEventRepository.createMany(data);

    return result.count;
  },
};

export default missionEventService;

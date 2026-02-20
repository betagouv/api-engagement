import { Prisma } from "@/db/core";
import { missionEventRepository } from "@/repositories/mission-event";
import { MissionEventCreateParams, MissionEventRecord } from "@/types/mission-event";
import { chunk } from "@/utils/array";

const MISSION_EVENT_BATCH_SIZE = 10;

const mapChangesToJsonInput = (changes: MissionEventCreateParams["changes"]): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (changes === undefined) {
    return undefined;
  }
  if (changes === null) {
    return Prisma.JsonNull;
  }
  return changes as Prisma.InputJsonValue;
};

const toCreateInput = (event: MissionEventCreateParams): Prisma.MissionEventCreateManyInput => ({
  missionId: event.missionId,
  type: event.type,
  createdBy: event.createdBy ?? null,
  changes: mapChangesToJsonInput(event.changes),
});

export const missionEventService = {
  async createMissionEvent(event: MissionEventCreateParams): Promise<MissionEventRecord> {
    const data = toCreateInput(event) as Prisma.MissionEventUncheckedCreateInput;
    return await missionEventRepository.create(data);
  },

  async createMissionEvents(events: MissionEventCreateParams[]): Promise<number> {
    if (!events.length) {
      return 0;
    }

    console.log(`[MissionEvent] Creation of ${events.length} mission_event`);

    const data: Prisma.MissionEventCreateManyInput[] = events.map(toCreateInput);
    const batches = chunk(data, MISSION_EVENT_BATCH_SIZE);
    let total = 0;

    for (const batch of batches) {
      const result = await missionEventRepository.createMany(batch);
      total += result.count;
    }

    return total;
  },
};

export default missionEventService;

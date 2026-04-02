import { handleMissionEnrichment } from "@/worker/handlers/mission-enrichment";
import { missionPayloadSchema } from "@/worker/types";
import { handleMissionScoring } from "./handlers/mission-scoring";

export const taskRegistry = {
  "mission.enrichment": {
    queue: "mission-enrichment",
    schema: missionPayloadSchema,
    handler: handleMissionEnrichment,
  },
  "mission.scoring": {
    queue: "mission-scoring",
    schema: missionPayloadSchema,
    handler: handleMissionScoring,
  },
};

export type TaskType = keyof typeof taskRegistry;

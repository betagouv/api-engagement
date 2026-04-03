import { handleMissionScoring } from "@/worker/handlers/mission-scoring";
import { defineTask, missionPayloadSchema, TaskRegistryEntry } from "@/worker/types";
import { handleMissionEnrichment } from "./handlers/mission-enrichment";

export const taskRegistry: Record<string, TaskRegistryEntry> = {
  "mission.enrichment": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_ENRICHMENT ?? "",
    schema: missionPayloadSchema,
    handler: handleMissionEnrichment,
  }),
  "mission.scoring": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_SCORING ?? "",
    schema: missionPayloadSchema,
    handler: handleMissionScoring,
  }),
};

export type TaskType = keyof typeof taskRegistry;

import { handleMissionEnrichment } from "./handlers/mission-enrichment";
import { handleMissionIndex } from "./handlers/mission-index";
import { handleMissionScoring } from "./handlers/mission-scoring";
import { defineTask, missionEnrichmentPayloadSchema, missionIndexPayloadSchema, missionScoringPayloadSchema, TaskRegistryEntry } from "./types";

export const taskRegistry: Record<string, TaskRegistryEntry> = {
  "mission.enrichment": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_ENRICHMENT ?? "",
    schema: missionEnrichmentPayloadSchema,
    handler: handleMissionEnrichment,
  }),
  "mission.scoring": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_SCORING ?? "",
    schema: missionScoringPayloadSchema,
    handler: handleMissionScoring,
  }),
  "mission.index": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_INDEX ?? "",
    schema: missionIndexPayloadSchema,
    handler: handleMissionIndex,
  }),
};

export type TaskType = keyof typeof taskRegistry;

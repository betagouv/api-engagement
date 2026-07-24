import { handleMissionDiffusion } from "./handlers/mission-diffusion";
import { handleMissionEnrichment } from "./handlers/mission-enrichment";
import { handleMissionIndex } from "./handlers/mission-index";
import { handleMissionScoring } from "./handlers/mission-scoring";
import { handlePublisherDiffusion } from "./handlers/publisher-diffusion";
import {
  defineTask,
  missionDiffusionPayloadSchema,
  missionEnrichmentPayloadSchema,
  missionIndexPayloadSchema,
  missionScoringPayloadSchema,
  publisherDiffusionPayloadSchema,
  TaskRegistryEntry,
} from "./types";

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
  "mission.diffusion": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_DIFFUSION ?? "",
    schema: missionDiffusionPayloadSchema,
    handler: handleMissionDiffusion,
  }),
  "publisher.diffusion": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_DIFFUSION ?? "",
    schema: publisherDiffusionPayloadSchema,
    handler: handlePublisherDiffusion,
  }),
  "mission.index": defineTask({
    queueUrl: process.env.SCW_QUEUE_URL_MISSION_INDEX ?? "",
    schema: missionIndexPayloadSchema,
    handler: handleMissionIndex,
  }),
};

export type TaskType = keyof typeof taskRegistry;

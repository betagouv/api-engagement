import type { ClassificationInput } from "@/services/mission-enrichment/parser";
import type { FlexibleSchema, LanguageModel } from "ai";

export type MissionEnrichmentProviderResult = {
  object: { classifications: ClassificationInput[] };
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type MissionEnrichmentProviderInput = {
  systemPrompt: string;
  userMessage: string;
  promptVersion: {
    MODEL: LanguageModel;
    ENRICHMENT_SCHEMA: FlexibleSchema<unknown>;
    TEMPERATURE: number;
  };
};

export interface MissionEnrichmentProvider {
  generate(input: MissionEnrichmentProviderInput): Promise<MissionEnrichmentProviderResult>;
}

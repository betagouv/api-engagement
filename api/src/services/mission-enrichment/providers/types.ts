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
  // Modèle résolu à l'exécution depuis la config (provider + model id), plutôt que porté par la
  // version de prompt : permet de basculer le fournisseur IA par environnement. Optionnel car le
  // provider `mock` court-circuite le LLM et n'a pas de modèle.
  model?: LanguageModel;
  promptVersion: {
    ENRICHMENT_SCHEMA: FlexibleSchema<unknown>;
    TEMPERATURE: number;
  };
};

export interface MissionEnrichmentProvider {
  generate(input: MissionEnrichmentProviderInput): Promise<MissionEnrichmentProviderResult>;
}

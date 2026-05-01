import type { LanguageModel } from "ai";

import type { AiProvider } from "@/services/ai/service";

type LanguageModelFactory<TModelId extends string> = (modelId: TModelId) => LanguageModel;

export class VercelAiProviderAdapter<TModelId extends string = string> implements AiProvider {
  constructor(private createLanguageModel: LanguageModelFactory<TModelId>) {}

  languageModel(modelId: string): LanguageModel {
    return this.createLanguageModel(modelId as TModelId);
  }
}

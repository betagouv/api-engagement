import type { LanguageModel } from "ai";

export type AiProvider = {
  languageModel(modelId: string): LanguageModel;
};

export class AiService {
  constructor(private providers: Record<string, AiProvider>) {}

  model(providerName: string, modelId: string): LanguageModel {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }

    return provider.languageModel(modelId);
  }
}

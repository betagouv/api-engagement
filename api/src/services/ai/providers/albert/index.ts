import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AiProvider } from "@/services/ai/service";

import { createAlbertLanguageModel } from "./language-model";

export class AlbertProvider implements AiProvider {
  languageModel(modelId: string): LanguageModelV3 {
    /*
     * LanguageModelV3 est le contrat bas niveau de AI SDK v6 pour les providers custom.
     * Le reste de l'application expose le type public LanguageModel via AiService,
     * ce qui permet de consommer Albert et les providers officiels de la même façon.
     */
    return createAlbertLanguageModel(modelId);
  }
}

export const albert = (modelId: string): LanguageModelV3 => new AlbertProvider().languageModel(modelId);

import type { MissionEnrichmentProviderResult } from "./types";

type TokenUsage = MissionEnrichmentProviderResult["usage"];

// Somme des usages connus uniquement : l'absence d'information ne devient jamais zéro.
export const addTokenUsage = (left: TokenUsage, right: TokenUsage): TokenUsage => {
  const sum = (a: number | undefined, b: number | undefined) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));
  return {
    inputTokens: sum(left.inputTokens, right.inputTokens),
    outputTokens: sum(left.outputTokens, right.outputTokens),
    totalTokens: sum(left.totalTokens, right.totalTokens),
  };
};

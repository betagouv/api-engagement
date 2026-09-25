import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { estimateTokens, TokenRateLimiter } from "./rate-limit";
import type { CollectedDocument } from "./types";

const MAX_FILE_CHARS = 32_000;
const MAX_TOTAL_SOURCE_CHARS = 52_000;
const MAX_EXISTING_DOCUMENT_CHARS = 15_000;
const MAX_DOCUMENT_OUTPUT_TOKENS = 4_000;
const MAX_SUMMARY_OUTPUT_TOKENS = 2_000;

const truncate = (value: string, maxChars: number, label: string): string =>
  value.length <= maxChars ? value : `${value.slice(0, maxChars)}\n[… ${label} tronqué : ${value.length - maxChars} caractères omis]`;

const stripMarkdownFence = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return `${match ? match[1].trim() : trimmed}\n`;
};

const buildSourcesContext = (repositoryRoot: string, files: string[]): string => {
  let total = 0;
  const blocks: string[] = [];
  const omitted: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(repositoryRoot, file), "utf8");
    const block = `\n===== SOURCE: ${file} =====\n${truncate(content, MAX_FILE_CHARS, file)}`;
    if (total + block.length > MAX_TOTAL_SOURCE_CHARS) {
      omitted.push(file);
      continue;
    }
    blocks.push(block);
    total += block.length;
  }

  if (omitted.length > 0) blocks.push(`\n===== SOURCES NON INCLUSES FAUTE DE PLACE =====\n${omitted.join("\n")}`);
  return blocks.join("\n");
};

const getSystemPrompt = (): string => `Tu rédiges un référentiel fonctionnel interne en français pour le produit Plateforme de l'Engagement.

Règles impératives :
- Décris uniquement les comportements établis par les sources fournies.
- N'invente aucune intention produit et ne qualifie aucun comportement de bug, d'ambiguïté ou d'incohérence.
- Ne rédige pas une FAQ et ne recommande pas ce qu'il faut communiquer à un utilisateur.
- Sois complet et précis : conditions, effets, valeurs, bornes, exceptions, effets secondaires, persistance, erreurs et fallbacks.
- Conserve les clés techniques lorsqu'elles sont nécessaires à la précision.
- La configuration déployée fournie fait autorité sur les valeurs par défaut du code : décris la valeur effectivement déployée (ex. version active), en mentionnant le défaut du code comme repli seulement si c'est utile.
- Lorsque des consignes spécifiques au chapitre sont fournies, traite-les intégralement.
- Ne reproduis pas de longs blocs de code, mais explicite les formules et calculs (facteurs, poids, agrégation, normalisation, bornes) en toutes lettres.
- Cite uniquement des chemins réellement présents dans les sources fournies.
- Termine obligatoirement par une section "## Sources" contenant une liste de chemins entre backticks.
- Retourne uniquement le Markdown du document, sans bloc de code englobant ni commentaire.`;

export const generateDocument = async (params: {
  openai: OpenAI;
  model: string;
  repositoryRoot: string;
  docsDirectory: string;
  document: CollectedDocument;
  changedSources: string[];
  deployedConfig: string;
  limiter: TokenRateLimiter;
}): Promise<string> => {
  const { openai, model, repositoryRoot, docsDirectory, document, changedSources, deployedConfig, limiter } = params;
  const outputPath = path.join(docsDirectory, document.path);
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "(document inexistant)";
  const sources = buildSourcesContext(repositoryRoot, document.files);

  const systemPrompt = getSystemPrompt();
  const userPrompt = `# Document à produire

Chemin : ${document.path}
Titre attendu : ${document.title}
Objectif : ${document.objective}
${document.instructions ? `\n# Consignes spécifiques au chapitre\n\n${document.instructions}\n` : ""}
# Configuration déployée en production (fait autorité sur les valeurs par défaut du code)

${deployedConfig || "- (non disponible)"}

# Document existant

Préserve sa structure et ses formulations lorsqu'elles restent exactes. Évite toute réécriture cosmétique.

${truncate(existing, MAX_EXISTING_DOCUMENT_CHARS, "document existant")}

# Sources de vérité

${sources}

# Fichiers modifiés ou supprimés depuis la génération précédente

${changedSources.map((file) => `- ${file}`).join("\n") || "- Aucun (régénération complète)"}`;

  await limiter.reserve(estimateTokens(systemPrompt.length + userPrompt.length, MAX_DOCUMENT_OUTPUT_TOKENS));
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: MAX_DOCUMENT_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Réponse vide du modèle pour ${document.path}`);
  return stripMarkdownFence(content);
};

export const generatePullRequestSummary = async (params: {
  openai: OpenAI;
  model: string;
  changedSources: string[];
  changedDocuments: string[];
  diffs: string;
  limiter: TokenRateLimiter;
}): Promise<string> => {
  const { openai, model, changedSources, changedDocuments, diffs, limiter } = params;
  const systemPrompt =
    "Tu résumes en français une mise à jour automatique de documentation fonctionnelle. Reste factuel. Ne qualifie aucun comportement de bug, d'ambiguïté ou d'incohérence. Retourne uniquement du Markdown.";
  const userPrompt = `Produis exactement les sections suivantes :
## Sources modifiées
## Chapitres mis à jour
## Règles ajoutées
## Règles modifiées
## Règles supprimées

Utilise "Aucune identifiée" quand une catégorie est vide.

Sources modifiées :
${changedSources.map((file) => `- ${file}`).join("\n") || "- Aucune liste disponible"}

Documents modifiés :
${changedDocuments.map((file) => `- ${file}`).join("\n")}

Diff documentaire :
${truncate(diffs, 40_000, "diff documentaire")}`;

  await limiter.reserve(estimateTokens(systemPrompt.length + userPrompt.length, MAX_SUMMARY_OUTPUT_TOKENS));
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: MAX_SUMMARY_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Réponse vide lors de la génération du résumé de PR");
  return stripMarkdownFence(content);
};

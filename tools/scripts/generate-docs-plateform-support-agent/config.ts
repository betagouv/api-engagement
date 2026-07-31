import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { DocumentConfig, SourcesConfig } from "./types";

export const DOCUMENTS: DocumentConfig[] = [
  ["01-product-overview.md", "Vue d'ensemble du produit", "Décrire la finalité, les fonctionnalités, les acteurs et l'architecture fonctionnelle."],
  ["02-user-journeys.md", "Parcours utilisateur", "Décrire les parcours de bout en bout, du quiz à la candidature, aux emails et à la newsletter."],
  ["03-quiz.md", "Quiz", "Documenter les étapes, options, validations, embranchements, navigation et réponses du quiz."],
  ["04-user-scoring.md", "Scoring utilisateur", "Décrire la création, la mise à jour et la persistance du scoring utilisateur."],
  ["05-mission-search.md", "Recherche de missions", "Décrire le catalogue, les filtres, facettes, pagination et états de résultat."],
  ["06-matching.md", "Matching", "Décrire les versions, taxonomies, pondérations, scores, gates, classement, pagination et cache."],
  ["07-eligibility-and-scoring.md", "Éligibilité et scoring des missions", "Documenter les règles déterministes et contraintes d'éligibilité."],
  ["08-taxonomies.md", "Taxonomies", "Décrire les taxonomies, leurs valeurs, transformations et usages."],
  ["09-mission-detail-and-application.md", "Détail d'une mission et candidature", "Décrire le chargement, l'affichage, la candidature et les missions similaires."],
  ["10-emails-newsletter-and-consent.md", "Emails, newsletter et consentement", "Décrire les emails, la newsletter et les règles de consentement."],
  ["11-data-persistence-and-state.md", "Persistance des données et états", "Décrire les données persistées, identifiants, caches, resets et invalidations."],
  ["12-errors-edge-cases-and-fallbacks.md", "Erreurs, cas limites et fallbacks", "Décrire les comportements prévus pour les erreurs, valeurs absentes et fallbacks."],
].map(([documentPath, title, objective]) => ({ path: documentPath, title, objective, sources: [] }));

const readStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) throw new Error(`${label} doit être une liste de chaînes non vides`);
  return value;
};

export const loadConfig = (configPath: string): SourcesConfig => {
  const parsed = YAML.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown> | null;
  if (!parsed || parsed.version !== 1) throw new Error("sources.yml doit déclarer version: 1");
  return { version: 1, include: readStringArray(parsed.include, "include"), exclude: readStringArray(parsed.exclude, "exclude") };
};

export const resolveRepositoryPaths = (repositoryRoot: string) => ({
  docsDirectory: path.join(repositoryRoot, "plateform/docs/support-agent"),
  configPath: path.join(repositoryRoot, "plateform/docs/support-agent/sources.yml"),
  readmePath: path.join(repositoryRoot, "plateform/docs/support-agent/README.md"),
});

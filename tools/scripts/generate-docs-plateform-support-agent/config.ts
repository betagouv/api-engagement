import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { DocumentConfig, SourcesConfig } from "./types";

const assertStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${label} doit être une liste de chaînes non vides`);
  }
  return value;
};

const parseDocument = (value: unknown, index: number): DocumentConfig => {
  if (!value || typeof value !== "object") throw new Error(`documents[${index}] est invalide`);
  const document = value as Record<string, unknown>;
  for (const key of ["path", "title", "objective"] as const) {
    if (typeof document[key] !== "string" || document[key].length === 0) {
      throw new Error(`documents[${index}].${key} doit être une chaîne non vide`);
    }
  }

  const outputPath = document.path as string;
  if (!/^\d{2}-[a-z0-9-]+\.md$/.test(outputPath) || outputPath.includes("..")) {
    throw new Error(`Chemin de document non autorisé : ${outputPath}`);
  }

  return {
    path: outputPath,
    title: document.title as string,
    objective: document.objective as string,
    sources: assertStringArray(document.sources, `documents[${index}].sources`),
  };
};

export const loadConfig = (configPath: string): SourcesConfig => {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = YAML.parse(raw) as Record<string, unknown> | null;
  if (!parsed || parsed.version !== 1) throw new Error("sources.yml doit déclarer version: 1");
  if (!Array.isArray(parsed.documents) || parsed.documents.length === 0) throw new Error("sources.yml ne contient aucun document");

  const documents = parsed.documents.map(parseDocument);
  const paths = documents.map((document) => document.path);
  if (new Set(paths).size !== paths.length) throw new Error("Deux documents utilisent le même chemin de sortie");

  return {
    version: 1,
    exclude: assertStringArray(parsed.exclude, "exclude"),
    documents,
  };
};

export const resolveRepositoryPaths = (repositoryRoot: string) => ({
  docsDirectory: path.join(repositoryRoot, "plateform/docs/support-agent"),
  configPath: path.join(repositoryRoot, "plateform/docs/support-agent/sources.yml"),
  readmePath: path.join(repositoryRoot, "plateform/docs/support-agent/README.md"),
});

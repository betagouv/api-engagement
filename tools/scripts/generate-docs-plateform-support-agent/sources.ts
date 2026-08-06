import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import { DOCUMENTS } from "./config";
import type { CollectedDocument, SourcesConfig } from "./types";

const FORBIDDEN_SOURCE_PATTERNS = [/(^|\/)\.env(?:\.|$)/, /(^|\/)node_modules\//, /(^|\/)dist\//, /(^|\/)build\//, /(^|\/)coverage\//];

const extractCitations = (content: string): string[] => [...content.matchAll(/`((?:plateform|api|packages)\/[A-Za-z0-9_@./$-]+)`/g)].map((match) => match[1]);

export const collectSourceFiles = async (repositoryRoot: string, config: SourcesConfig): Promise<string[]> => {
  const files = await fg(config.include, { cwd: repositoryRoot, ignore: config.exclude, onlyFiles: true, unique: true, dot: false, followSymbolicLinks: false });
  files.sort();
  const forbidden = files.find((file) => FORBIDDEN_SOURCE_PATTERNS.some((pattern) => pattern.test(file)));
  if (forbidden) throw new Error(`Source interdite détectée : ${forbidden}`);
  return files;
};

export const isSourceInScope = (file: string, config: SourcesConfig): boolean =>
  config.include.some((pattern) => (pattern.endsWith("/**") ? file.startsWith(pattern.slice(0, -2)) : file === pattern));

export const collectDocuments = (repositoryRoot: string, docsDirectory: string, sourceFiles: string[]): CollectedDocument[] => {
  const allowed = new Set(sourceFiles);
  return DOCUMENTS.map((document) => {
    const outputPath = path.join(docsDirectory, document.path);
    // Citations brutes : conservées telles quelles (y compris chemins supprimés) pour détecter les changements de périmètre.
    const citations = fs.existsSync(outputPath) ? [...new Set(extractCitations(fs.readFileSync(outputPath, "utf8")))].sort() : [];
    // Fichiers réellement lisibles et dans la frontière globale : servent à construire le contexte du modèle.
    const files = citations.filter((file) => allowed.has(file) && fs.existsSync(path.join(repositoryRoot, file)));
    return { ...document, citations, files };
  });
};

// Un chapitre est régénéré s'il est manquant, ou si l'un des chemins qu'il cite figure parmi les fichiers modifiés.
export const selectDocuments = (documents: CollectedDocument[], changedSourceFiles: string[], forceAll: boolean, docsDirectory: string): CollectedDocument[] => {
  if (forceAll) return documents;
  const changed = new Set(changedSourceFiles);
  return documents.filter((document) => {
    if (!fs.existsSync(path.join(docsDirectory, document.path))) return true;
    return document.citations.some((file) => changed.has(file));
  });
};

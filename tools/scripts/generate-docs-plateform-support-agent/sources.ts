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

// Matcher commun aux motifs de portée : chemin exact ou préfixe `.../**` (aucun `*` intermédiaire).
export const fileMatchesPatterns = (file: string, patterns: string[] | undefined): boolean =>
  (patterns ?? []).some((pattern) => (pattern.endsWith("/**") ? file.startsWith(pattern.slice(0, -2)) : file === pattern));

export const isSourceInScope = (file: string, config: SourcesConfig): boolean => fileMatchesPatterns(file, config.include);

export const collectDocuments = (repositoryRoot: string, docsDirectory: string, sourceFiles: string[]): CollectedDocument[] => {
  const allowed = new Set(sourceFiles);
  return DOCUMENTS.map((document) => {
    const outputPath = path.join(docsDirectory, document.path);
    // Citations brutes : conservées telles quelles (y compris chemins supprimés) pour détecter les changements de périmètre.
    const citations = fs.existsSync(outputPath) ? [...new Set(extractCitations(fs.readFileSync(outputPath, "utf8")))].sort() : [];
    // Contexte du chapitre : union des citations existantes et des fichiers couverts par son `scope`.
    // Le scope capte les fichiers neufs ou renommés qu'aucune citation ne référence encore.
    const citedFiles = citations.filter((file) => allowed.has(file) && fs.existsSync(path.join(repositoryRoot, file)));
    const scopeFiles = document.scope ? sourceFiles.filter((file) => fileMatchesPatterns(file, document.scope)) : [];
    const files = [...new Set([...citedFiles, ...scopeFiles])].sort();
    return { ...document, citations, files };
  });
};

// Un chapitre est régénéré s'il est manquant, ou si l'un de ses fichiers modifiés (cité ou couvert par son scope) a changé.
export const selectDocuments = (documents: CollectedDocument[], changedSourceFiles: string[], forceAll: boolean, docsDirectory: string): CollectedDocument[] => {
  if (forceAll) return documents;
  const changed = new Set(changedSourceFiles);
  return documents.filter((document) => {
    if (!fs.existsSync(path.join(docsDirectory, document.path))) return true;
    if (document.citations.some((file) => changed.has(file))) return true;
    return changedSourceFiles.some((file) => fileMatchesPatterns(file, document.scope));
  });
};

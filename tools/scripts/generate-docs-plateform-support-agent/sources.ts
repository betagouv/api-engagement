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
    const citations = fs.existsSync(outputPath) ? extractCitations(fs.readFileSync(outputPath, "utf8")) : [];
    const files = citations.filter((file) => allowed.has(file) && fs.existsSync(path.join(repositoryRoot, file)));
    return { ...document, files: [...new Set(files)].sort() };
  });
};

export const selectDocuments = (documents: CollectedDocument[], changedSourceFiles: string[], forceAll: boolean, docsDirectory: string): CollectedDocument[] => {
  if (forceAll) return documents;
  if (changedSourceFiles.length === 0) return documents.filter((document) => !fs.existsSync(path.join(docsDirectory, document.path)));
  return documents;
};

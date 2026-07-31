import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import type { CollectedDocument, SourcesConfig } from "./types";

const FORBIDDEN_SOURCE_PATTERNS = [/(^|\/)\.env(?:\.|$)/, /(^|\/)node_modules\//, /(^|\/)dist\//, /(^|\/)build\//, /(^|\/)coverage\//];

export const collectDocuments = async (repositoryRoot: string, config: SourcesConfig): Promise<CollectedDocument[]> => {
  const results: CollectedDocument[] = [];

  for (const document of config.documents) {
    const files = await fg(document.sources, {
      cwd: repositoryRoot,
      ignore: config.exclude,
      onlyFiles: true,
      unique: true,
      dot: false,
      followSymbolicLinks: false,
    });
    files.sort();

    const forbidden = files.find((file) => FORBIDDEN_SOURCE_PATTERNS.some((pattern) => pattern.test(file)));
    if (forbidden) throw new Error(`Source interdite détectée pour ${document.path} : ${forbidden}`);
    if (files.length === 0) throw new Error(`Aucune source trouvée pour ${document.path}`);

    for (const file of files) {
      const absolutePath = path.resolve(repositoryRoot, file);
      if (!absolutePath.startsWith(`${repositoryRoot}${path.sep}`) || !fs.statSync(absolutePath).isFile()) {
        throw new Error(`Source hors dépôt ou invalide : ${file}`);
      }
    }

    results.push({ ...document, files });
  }

  return results;
};

export const selectDocuments = (documents: CollectedDocument[], changedFiles: string[], forceAll: boolean, docsDirectory: string): CollectedDocument[] => {
  if (forceAll) return documents;
  if (changedFiles.length === 0) return documents.filter((document) => !fs.existsSync(path.join(docsDirectory, document.path)));
  const generatorChanged = changedFiles.some(
    (file) => file === "plateform/docs/support-agent/sources.yml" || file.startsWith("tools/scripts/generate-docs-plateform-support-agent/")
  );
  if (generatorChanged) return documents;

  return documents.filter((document) => {
    if (!fs.existsSync(path.join(docsDirectory, document.path))) return true;
    const sources = new Set(document.files);
    return changedFiles.some((file) => sources.has(file));
  });
};

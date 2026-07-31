import fs from "node:fs";
import path from "node:path";
import type { CollectedDocument } from "./types";

const SECRET_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "clé privée", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "token GitHub", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { label: "clé OpenAI", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
];

const extractCitedPaths = (content: string): string[] => {
  const matches = content.matchAll(/`((?:plateform|api|packages)\/[A-Za-z0-9_@./$-]+)`/g);
  return [...matches].map((match) => match[1]);
};

export const validateDocuments = (repositoryRoot: string, docsDirectory: string, documents: CollectedDocument[]): void => {
  const errors: string[] = [];

  for (const document of documents) {
    const outputPath = path.join(docsDirectory, document.path);
    if (!fs.existsSync(outputPath)) {
      errors.push(`${document.path}: fichier absent`);
      continue;
    }
    const content = fs.readFileSync(outputPath, "utf8");
    if (content.trim().length < 200) errors.push(`${document.path}: contenu trop court`);
    if (!/^#\s+.+/m.test(content)) errors.push(`${document.path}: titre H1 absent`);
    if (!/^## Sources\s*$/m.test(content)) errors.push(`${document.path}: section Sources absente`);

    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(content)) errors.push(`${document.path}: ${secret.label} potentiellement présent`);
    }

    const citations = extractCitedPaths(content);
    if (citations.length === 0) errors.push(`${document.path}: aucune source citée`);
    for (const citation of citations) {
      if (!fs.existsSync(path.join(repositoryRoot, citation))) errors.push(`${document.path}: source citée introuvable (${citation})`);
    }
  }

  if (errors.length > 0) throw new Error(`Validation documentaire échouée :\n- ${errors.join("\n- ")}`);
};

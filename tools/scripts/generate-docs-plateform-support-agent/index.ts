import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { loadConfig, resolveRepositoryPaths } from "./config";
import { generateDocument, generatePullRequestSummary } from "./generator";
import { getChangedFiles, getHeadCommit, getRepositoryRoot, readPreviousSourceCommit } from "./git";
import { TokenRateLimiter } from "./rate-limit";
import { collectDocuments, collectSourceFiles, isSourceInScope, selectDocuments } from "./sources";
import type { GenerationResult } from "./types";

const DEFAULT_TOKENS_PER_MINUTE = 28_000;

type CliOptions = {
  forceAll: boolean;
  summaryFile?: string;
};

const parseArgs = (args: string[]): CliOptions => {
  const summaryIndex = args.indexOf("--summary-file");
  return {
    forceAll: args.includes("--all"),
    summaryFile: summaryIndex >= 0 ? args[summaryIndex + 1] : undefined,
  };
};

const updateReadmeMetadata = (readme: string, sourceCommit: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  return readme.replace(/^generated_at:\s*.*$/m, `generated_at: ${date}`).replace(/^source_commit:\s*.*$/m, `source_commit: ${sourceCommit}`);
};

const gitDiffForDocuments = (repositoryRoot: string, docsDirectory: string, documents: string[]): string => {
  if (documents.length === 0) return "";
  const paths = documents.map((document) => path.relative(repositoryRoot, path.join(docsDirectory, document)));
  try {
    return execFileSync("git", ["diff", "--", ...paths], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return "";
  }
};

const generate = async (options: CliOptions): Promise<GenerationResult> => {
  const repositoryRoot = getRepositoryRoot();
  const paths = resolveRepositoryPaths(repositoryRoot);
  const config = loadConfig(paths.configPath);
  const sourceFiles = await collectSourceFiles(repositoryRoot, config);
  const documents = collectDocuments(repositoryRoot, paths.docsDirectory, sourceFiles);
  const readme = fs.readFileSync(paths.readmePath, "utf8");
  const previousSourceCommit = readPreviousSourceCommit(readme);
  const sourceCommit = getHeadCommit(repositoryRoot);
  const changedSources = getChangedFiles(repositoryRoot, previousSourceCommit).filter((file) => isSourceInScope(file, config));
  const selected = selectDocuments(documents, changedSources, options.forceAll || !previousSourceCommit, paths.docsDirectory);

  // Les fichiers modifiés qu'aucun chapitre ne cite ne déclenchent aucune régénération.
  // On les signale pour qu'un `--all` (ou l'ajout manuel d'une citation) soit décidé si besoin.
  const citedByAnyDocument = new Set(documents.flatMap((document) => document.citations));
  const unmatchedChangedSources = changedSources.filter((file) => !citedByAnyDocument.has(file));
  if (unmatchedChangedSources.length > 0) {
    console.warn(
      `Fichiers modifiés non rattachés à un chapitre (relancer avec --all pour les prendre en compte) :\n${unmatchedChangedSources.map((file) => `- ${file}`).join("\n")}`
    );
  }

  if (selected.length === 0) {
    console.log("Aucun chapitre concerné par les changements détectés.");
    return { changedDocuments: [], changedSources, sourceCommit };
  }

  dotenv.config({ path: path.join(repositoryRoot, "tools/scripts/.env") });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY est requis pour générer la documentation");
  const model = process.env.PLATEFORM_SUPPORT_DOCS_OPENAI_MODEL || "gpt-4o";
  const tokensPerMinute = Number(process.env.PLATEFORM_SUPPORT_DOCS_TPM) || DEFAULT_TOKENS_PER_MINUTE;
  const openai = new OpenAI({ apiKey, maxRetries: 5 });
  const limiter = new TokenRateLimiter(tokensPerMinute);
  const changedSet = new Set(changedSources);
  const changedDocuments: string[] = [];

  for (const [index, document] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] Génération de ${document.path}`);
    const outputPath = path.join(paths.docsDirectory, document.path);
    const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    // Périmètre propre au chapitre : ses citations modifiées (supprimées comprises pour l'invite),
    // en priorité dans le contexte, puis le reste de ses sources citées.
    const relevantChanged = document.citations.filter((file) => changedSet.has(file));
    const relevantChangedExisting = relevantChanged.filter((file) => fs.existsSync(path.join(repositoryRoot, file)));
    const sources = [...new Set([...relevantChangedExisting, ...document.files])];
    const generated = await generateDocument({
      openai,
      model,
      repositoryRoot,
      docsDirectory: paths.docsDirectory,
      document: { ...document, files: sources },
      changedSources: relevantChanged,
      limiter,
    });
    if (generated !== previous) {
      fs.writeFileSync(outputPath, generated, "utf8");
      changedDocuments.push(document.path);
    }
  }

  if (changedDocuments.length === 0) {
    console.log("La documentation générée est identique à la version courante.");
    return { changedDocuments, changedSources, sourceCommit };
  }

  fs.writeFileSync(paths.readmePath, updateReadmeMetadata(readme, sourceCommit), "utf8");

  if (options.summaryFile) {
    const diff = gitDiffForDocuments(repositoryRoot, paths.docsDirectory, changedDocuments);
    const summary = await generatePullRequestSummary({ openai, model, changedSources, changedDocuments, diffs: diff, limiter });
    fs.writeFileSync(options.summaryFile, summary, "utf8");
  }

  console.log(`${changedDocuments.length} chapitre(s) mis à jour.`);
  return { changedDocuments, changedSources, sourceCommit };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  await generate(options);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { loadConfig, resolveRepositoryPaths } from "./config";
import { loadDeployedConfig } from "./deployed-config";
import { generateDocument, generatePullRequestSummary } from "./generator";
import { commitExists, getChangedFiles, getHeadCommit, getRepositoryRoot, readPreviousSourceCommit } from "./git";
import { TokenRateLimiter } from "./rate-limit";
import { collectDocuments, collectSourceFiles, fileMatchesPatterns, isSourceInScope, selectDocuments } from "./sources";
import type { GenerationResult } from "./types";

const DEFAULT_TOKENS_PER_MINUTE = 28_000;

// Fichiers de test : injectés en dernier dans le contexte (priorité à l'implémentation sous budget).
const isTestFile = (file: string): boolean => /(\.test\.|\.spec\.|(?:^|\/)__tests__\/)/.test(file);

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
  const inScopeSourceFiles = new Set(sourceFiles);
  const documents = collectDocuments(repositoryRoot, paths.docsDirectory, sourceFiles);
  const readme = fs.readFileSync(paths.readmePath, "utf8");
  const previousSourceCommit = readPreviousSourceCommit(readme);
  const sourceCommit = getHeadCommit(repositoryRoot);
  const rawChangedFiles = getChangedFiles(repositoryRoot, previousSourceCommit);
  const changedSources = rawChangedFiles.filter((file) => isSourceInScope(file, config));
  // Certains fichiers modifient la sortie sans correspondre à un motif `include` de `sources.yml` :
  // la config déployée (tfvars, overlay injecté partout), la frontière `sources.yml` elle-même, et
  // le code du générateur (scopes, objectifs, consignes, prompts, logique). Un changement de l'un
  // d'eux force une régénération complète, sinon `changedSources` resterait vide et rien ne bougerait.
  const deployedConfigRelative = path.relative(repositoryRoot, paths.deployedConfigPath);
  const sourcesConfigRelative = path.relative(repositoryRoot, paths.configPath);
  const generatorDirRelative = path.relative(repositoryRoot, paths.generatorDirectory);
  const configChangedFiles = rawChangedFiles.filter((file) => file === deployedConfigRelative || file === sourcesConfigRelative || file.startsWith(`${generatorDirRelative}/`));
  const configChanged = configChangedFiles.length > 0;
  if (configChanged) console.log(`Configuration de génération modifiée (${configChangedFiles.join(", ")}) : régénération complète.`);
  // Commit de base enregistré mais introuvable (ex. clone frais de `main` après squash) : le diff
  // ne peut pas être calculé, on force une régénération complète plutôt que de ne rien faire.
  const previousCommitMissing = !!previousSourceCommit && !commitExists(repositoryRoot, previousSourceCommit);
  if (previousCommitMissing) console.log(`Commit de base introuvable (${previousSourceCommit}) : régénération complète.`);
  const forceAll = options.forceAll || !previousSourceCommit || previousCommitMissing || configChanged;
  const selected = selectDocuments(documents, changedSources, forceAll, paths.docsDirectory);

  // Les fichiers modifiés qu'aucun chapitre ne cite et qu'aucun scope ne couvre ne déclenchent
  // aucune régénération. On les signale pour décider d'un `--all`, d'une citation ou d'un scope.
  const citedByAnyDocument = new Set(documents.flatMap((document) => document.citations));
  const unmatchedChangedSources = changedSources.filter((file) => !citedByAnyDocument.has(file) && !documents.some((document) => fileMatchesPatterns(file, document.scope)));
  if (unmatchedChangedSources.length > 0) {
    console.warn(
      `Fichiers modifiés non rattachés à un chapitre (relancer avec --all, ou ajouter une citation/un scope) :\n${unmatchedChangedSources.map((file) => `- ${file}`).join("\n")}`
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
  const deployedConfig = loadDeployedConfig(paths.deployedConfigPath);
  const changedDocuments: string[] = [];

  for (const [index, document] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] Génération de ${document.path}`);
    const outputPath = path.join(paths.docsDirectory, document.path);
    const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    // Périmètre propre au chapitre : ses fichiers modifiés (cités ou couverts par son scope,
    // suppressions comprises pour l'invite), placés en priorité dans le contexte.
    const relevantChanged = changedSources.filter((file) => document.citations.includes(file) || fileMatchesPatterns(file, document.scope));
    // Ne lit que des fichiers de `collectSourceFiles` (exclusions + interdits déjà appliqués) :
    // un fichier modifié couvert par `include` mais exclu (ex. secret versionné) n'est jamais envoyé.
    const relevantChangedExisting = relevantChanged.filter((file) => inScopeSourceFiles.has(file));
    // Priorité aux fichiers d'implémentation : les tests passent en dernier pour ne jamais évincer
    // un fichier de logique central (ex. matching-engine/index.ts) quand le budget de contexte est saturé.
    const sources = [...new Set([...relevantChangedExisting, ...document.files])].sort((a, b) => Number(isTestFile(a)) - Number(isTestFile(b)));
    const generated = await generateDocument({
      openai,
      model,
      repositoryRoot,
      docsDirectory: paths.docsDirectory,
      document: { ...document, files: sources },
      changedSources: relevantChanged,
      deployedConfig,
      limiter,
    });
    if (generated !== previous) {
      fs.writeFileSync(outputPath, generated, "utf8");
      changedDocuments.push(document.path);
    }
  }

  // Résumé PRODUIT AVANT d'avancer le point de reprise : si l'appel échoue, le commit source
  // n'est pas persisté et une relance retentera au lieu de sauter le résumé demandé.
  if (changedDocuments.length > 0 && options.summaryFile) {
    const diff = gitDiffForDocuments(repositoryRoot, paths.docsDirectory, changedDocuments);
    const summary = await generatePullRequestSummary({ openai, model, changedSources, changedDocuments, diffs: diff, limiter });
    fs.writeFileSync(options.summaryFile, summary, "utf8");
  }

  // Avance TOUJOURS le point de reprise (même si aucun chapitre n'a changé) une fois toute la
  // génération réussie : sans ça, un diff sans effet documentaire serait retraité indéfiniment.
  fs.writeFileSync(paths.readmePath, updateReadmeMetadata(readme, sourceCommit), "utf8");

  console.log(changedDocuments.length === 0 ? "La documentation générée est identique à la version courante." : `${changedDocuments.length} chapitre(s) mis à jour.`);
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

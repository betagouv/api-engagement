import dotenv from "dotenv";

import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PUBLISHER_IDS } from "@/config";
import type { MatchingEngineVersion } from "@/services/matching-engine/types";

import { aggregate, computeVerdict } from "./metrics";
import { renderReport } from "./report";
import { computeDeterministicScores } from "./scorers";
import type { CliOptions, Parcours, ParcoursArtifact } from "./types";
import { validateParcoursConfig } from "./validate";

const apiDir = path.resolve(__dirname, "../..");
const repoDir = path.resolve(apiDir, "..");
const runsDir = path.join(apiDir, "eval-runs");

const usage = `Usage: npx ts-node scripts/eval-matching/index.ts --campaign <nom> [--env staging|production|local] [--algo m1|m2] [--publisher-id <id>] [--dry-run] [--force] [--parcours <id>]`;

const getArgValue = (argv: string[], index: number, flag: string): string => {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} attend une valeur\n${usage}`);
  }
  return value;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    campaign: "",
    env: "staging",
    publisherId: "",
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--campaign") options.campaign = getArgValue(argv, index++, arg);
    else if (arg === "--env") options.env = getArgValue(argv, index++, arg) as CliOptions["env"];
    else if (arg === "--algo") options.algo = getArgValue(argv, index++, arg) as CliOptions["algo"];
    else if (arg === "--publisher-id") options.publisherId = getArgValue(argv, index++, arg);
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--parcours") options.parcours = getArgValue(argv, index++, arg);
    else throw new Error(`Argument inconnu: ${arg}\n${usage}`);
  }

  if (!options.campaign) throw new Error(`--campaign est requis\n${usage}`);
  if (!["staging", "production", "local"].includes(options.env)) throw new Error(`--env invalide\n${usage}`);
  if (options.algo && !["m1", "m2"].includes(options.algo)) throw new Error(`--algo invalide\n${usage}`);
  return options;
};

const loadEnv = (env: CliOptions["env"]): void => {
  const envFile = env === "local" ? ".env" : `.env.${env}`;
  const envPath = path.join(apiDir, envFile);
  const result = dotenv.config({ path: envPath, override: true, quiet: true });
  if (result.error) {
    dotenv.config({ quiet: true });
    if (env !== "local") {
      console.warn(`[eval:matching] ${envFile} introuvable, fallback sur api/.env et variables d'environnement courantes.`);
    }
  }
};

const loadParcours = async (): Promise<Parcours[]> => {
  const raw = await readFile(path.join(__dirname, "parcours.config.json"), "utf8");
  return validateParcoursConfig(JSON.parse(raw));
};

const gitSha = (): string | null => {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoDir, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

const ensureCampaignDir = async (campaign: string, force: boolean): Promise<string> => {
  const dir = path.join(runsDir, campaign);
  await mkdir(runsDir, { recursive: true });
  try {
    await mkdir(dir, { recursive: false });
  } catch {
    if (!force) {
      throw new Error(`Le dossier de campagne existe deja: ${dir}. Utiliser --force pour ecraser les artefacts.`);
    }
    await mkdir(dir, { recursive: true });
  }
  return dir;
};

const writeArtifact = async (campaignDir: string, artifact: ParcoursArtifact): Promise<void> => {
  await writeFile(path.join(campaignDir, `parcours-${artifact.parcours.id}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
};

const writeCampaignMetadata = async (campaignDir: string, options: CliOptions, judgeModel: string): Promise<void> => {
  const metadata = {
    campaign: options.campaign,
    env: options.env,
    algo: options.algo ?? null,
    publisherId: options.publisherId,
    dryRun: options.dryRun,
    parcours: options.parcours ?? null,
    gitSha: gitSha(),
    judgeModel,
    date: new Date().toISOString(),
  };
  await writeFile(path.join(campaignDir, "campaign.json"), `${JSON.stringify(metadata, null, 2)}\n`);
};

const runParcours = async (
  parcours: Parcours,
  options: CliOptions,
  deps: {
    createUserScoring: typeof import("./db-client").createUserScoring;
    getMatch: typeof import("./db-client").getMatch;
    getMissionDetails: typeof import("./db-client").getMissionDetails;
    judge: InstanceType<typeof import("./judge").JudgeClient>;
  }
): Promise<ParcoursArtifact> => {
  const startedAt = new Date().toISOString();
  const distinctId = `eval:${options.campaign}:${parcours.id}`;
  const payload = { answers: parcours.answers, distinctId, missionAlertEnabled: false as const };
  let userScoringId: string | undefined;

  try {
    userScoringId = await deps.createUserScoring(parcours.answers, distinctId);
    const match = await deps.getMatch({
      userScoringId,
      publisherId: options.publisherId,
      engineVersion: options.algo as MatchingEngineVersion | undefined,
    });
    const missions = await deps.getMissionDetails(match, options.publisherId);
    const deterministic = computeDeterministicScores(missions, parcours);
    const judgeRuns = [];
    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      judgeRuns.push(await deps.judge.judgeParcours(parcours, missions, runIndex, options.campaign));
    }
    const artifact: ParcoursArtifact = {
      status: "success",
      parcours,
      payload,
      userScoringId,
      match,
      missions,
      deterministic,
      judgeRuns,
      engineVersion: match.engineVersion as ParcoursArtifact["engineVersion"],
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    artifact.verdict = computeVerdict(artifact) ?? undefined;
    return artifact;
  } catch (error) {
    return {
      status: "failed",
      parcours,
      payload,
      userScoringId,
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  loadEnv(options.env);
  options.publisherId ||= process.env.EVAL_MATCHING_PUBLISHER_ID || PUBLISHER_IDS.PLATEFORM_ENGAGEMENT;

  const allParcours = await loadParcours();
  const selectedParcours = options.parcours ? allParcours.filter((parcours) => parcours.id === options.parcours) : allParcours;
  if (options.parcours && selectedParcours.length === 0) {
    throw new Error(`Parcours inconnu: ${options.parcours}`);
  }

  if (options.dryRun) {
    console.log(`Config valide: ${selectedParcours.length} parcours selectionne(s). Publisher: ${options.publisherId}.`);
    return;
  }

  const [{ pgConnected, pgDisconnect }, dbClient, { JUDGE_MODEL_ID, JudgeClient }] = await Promise.all([import("@/db/postgres"), import("./db-client"), import("./judge")]);
  await pgConnected();

  try {
    const campaignDir = await ensureCampaignDir(options.campaign, options.force);
    await writeCampaignMetadata(campaignDir, options, JUDGE_MODEL_ID);
    const judge = new JudgeClient();
    const artifacts: ParcoursArtifact[] = [];

    for (const parcours of selectedParcours) {
      console.log(`Evaluation ${parcours.id}...`);
      const artifact = await runParcours(parcours, options, { ...dbClient, judge });
      if (artifact.userScoringId) {
        try {
          artifact.cleanup = { userScoringDeleted: await dbClient.cleanupUserScoring(artifact.userScoringId) };
        } catch (error) {
          artifact.cleanup = { userScoringDeleted: false };
          console.error(`[eval:matching] Cleanup impossible pour userScoringId=${artifact.userScoringId}:`, error);
        }
      }
      await writeArtifact(campaignDir, artifact);
      artifacts.push(artifact);
    }

    const metrics = aggregate(artifacts);
    await writeFile(path.join(campaignDir, "report.md"), renderReport(metrics, artifacts));
    console.log(`Campagne terminee: ${campaignDir}`);
  } finally {
    await pgDisconnect();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

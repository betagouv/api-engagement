import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

import { ApiClient, getApiKey } from "./api-client";
import { JudgeClient, getJudgeModel } from "./judge";
import { aggregate, computeVerdict } from "./metrics";
import { renderReport } from "./report";
import { computeDeterministicScores } from "./scorers";
import type { CliOptions, MatchResponse, MissionWithDetail, Parcours, ParcoursArtifact } from "./types";
import { validateParcoursConfig } from "./validate";

const rootDir = path.resolve(__dirname, "..");
const runsDir = path.join(rootDir, "eval-runs");

const usage = `Usage: npm run eval:matching -- --campaign <nom> [--env staging|production] [--algo m1|m2] [--dry-run] [--force] [--parcours <id>]`;

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { campaign: "", env: "staging", dryRun: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--campaign") options.campaign = argv[++i] ?? "";
    else if (arg === "--env") options.env = (argv[++i] ?? "staging") as CliOptions["env"];
    else if (arg === "--algo") options.algo = (argv[++i] ?? "") as CliOptions["algo"];
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--parcours") options.parcours = argv[++i] ?? "";
    else throw new Error(`Argument inconnu: ${arg}\n${usage}`);
  }
  if (!options.campaign) throw new Error(`--campaign est requis\n${usage}`);
  if (!["staging", "production"].includes(options.env)) throw new Error(`--env invalide\n${usage}`);
  if (options.algo && !["m1", "m2"].includes(options.algo)) throw new Error(`--algo invalide\n${usage}`);
  return options;
};

const loadParcours = async (): Promise<Parcours[]> => {
  const raw = await readFile(path.join(__dirname, "parcours.config.json"), "utf8");
  return validateParcoursConfig(JSON.parse(raw));
};

const gitSha = (): string | null => {
  try {
    return execSync("git rev-parse HEAD", { cwd: path.resolve(rootDir, "../.."), encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

const ensureCampaignDir = async (campaign: string, force: boolean): Promise<string> => {
  const dir = path.join(runsDir, campaign);
  await mkdir(runsDir, { recursive: true });
  try {
    await mkdir(dir, { recursive: false });
  } catch (error) {
    if (!force) {
      throw new Error(`Le dossier de campagne existe deja: ${dir}. Utiliser --force pour ecraser les artefacts.`);
    }
    await mkdir(dir, { recursive: true });
  }
  return dir;
};

const fetchMissionDetails = async (client: ApiClient, match: MatchResponse): Promise<MissionWithDetail[]> => {
  const missions: MissionWithDetail[] = [];
  for (const item of match.items) {
    const detail = await client.getMissionDetail(item.mission.id);
    missions.push({ ...item, detail, descriptionMissing: !detail?.description });
  }
  return missions;
};

const runParcours = async (parcours: Parcours, options: CliOptions, client: ApiClient, judge: JudgeClient, campaignDir: string): Promise<ParcoursArtifact> => {
  const startedAt = new Date().toISOString();
  const distinctId = `eval:${options.campaign}:${parcours.id}`;
  const payload = { answers: parcours.answers, distinctId, missionAlertEnabled: false as const };

  try {
    const userScoringId = await client.createUserScoring(parcours.answers, distinctId);
    const match = await client.getMatch(userScoringId);
    const missions = await fetchMissionDetails(client, match);
    const deterministic = computeDeterministicScores(missions, parcours);
    const judgeRuns = [];
    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      judgeRuns.push(await judge.judgeParcours(parcours, missions, runIndex, options.campaign));
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
      engineVersion: match.engineVersion,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    artifact.verdict = computeVerdict(artifact) ?? undefined;
    await writeArtifact(campaignDir, artifact);
    return artifact;
  } catch (error) {
    const artifact: ParcoursArtifact = {
      status: "failed",
      parcours,
      payload,
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    await writeArtifact(campaignDir, artifact);
    return artifact;
  }
};

const writeArtifact = async (campaignDir: string, artifact: ParcoursArtifact): Promise<void> => {
  await writeFile(path.join(campaignDir, `parcours-${artifact.parcours.id}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
};

const writeCampaignMetadata = async (campaignDir: string, options: CliOptions, judgeModel: string | null): Promise<void> => {
  const metadata = {
    campaign: options.campaign,
    env: options.env,
    algo: options.algo ?? null,
    dryRun: options.dryRun,
    parcours: options.parcours ?? null,
    gitSha: gitSha(),
    judgeModel,
    date: new Date().toISOString(),
  };
  await writeFile(path.join(campaignDir, "campaign.json"), `${JSON.stringify(metadata, null, 2)}\n`);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const allParcours = await loadParcours();
  const selectedParcours = options.parcours ? allParcours.filter((parcours) => parcours.id === options.parcours) : allParcours;
  if (options.parcours && selectedParcours.length === 0) {
    throw new Error(`Parcours inconnu: ${options.parcours}`);
  }

  if (options.dryRun) {
    console.log(`Config valide: ${selectedParcours.length} parcours selectionne(s).`);
    return;
  }

  const campaignDir = await ensureCampaignDir(options.campaign, options.force);
  const judgeModel = getJudgeModel();
  await writeCampaignMetadata(campaignDir, options, judgeModel);
  const client = new ApiClient({ env: options.env, apiKey: getApiKey(options.env), engineVersion: options.algo });
  const judge = new JudgeClient(judgeModel);
  const artifacts: ParcoursArtifact[] = [];

  for (const parcours of selectedParcours) {
    console.log(`Evaluation ${parcours.id}...`);
    artifacts.push(await runParcours(parcours, options, client, judge, campaignDir));
  }

  const metrics = aggregate(artifacts);
  await writeFile(path.join(campaignDir, "report.md"), renderReport(metrics, artifacts));
  console.log(`Campagne terminee: ${campaignDir}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import type { CampaignMetrics, JudgeCause, ParcoursArtifact } from "./types";

const mean = (values: number[]): number | null => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const min = (values: number[]): number | null => (values.length ? Math.min(...values) : null);
const stddev = (values: number[]): number | null => {
  const avg = mean(values);
  if (avg == null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
};

export const averageJudgeScore = (artifact: ParcoursArtifact, key: "coherence" | "homogeneite"): number | null => {
  const scores = artifact.judgeRuns?.map((run) => run.output[key].score) ?? [];
  return mean(scores);
};

export const computeVerdict = (artifact: Pick<ParcoursArtifact, "deterministic" | "judgeRuns">): number | null => {
  if (!artifact.deterministic || !artifact.judgeRuns?.length) return null;
  if (artifact.deterministic.gateViolations.length > 0) return 1;
  const coherence = mean(artifact.judgeRuns.map((run) => run.output.coherence.score));
  const homogeneite = mean(artifact.judgeRuns.map((run) => run.output.homogeneite.score));
  if (coherence == null || homogeneite == null) return null;
  const geo = artifact.deterministic.geo;
  const weights = geo == null ? { coherence: 0.4 / 0.7, format: 0.2 / 0.7, homogeneite: 0.1 / 0.7, geo: 0 } : { coherence: 0.4, geo: 0.3, format: 0.2, homogeneite: 0.1 };
  return weights.coherence * coherence + weights.geo * (geo ?? 0) + weights.format * artifact.deterministic.format + weights.homogeneite * homogeneite;
};

const majorityCause = (artifact: ParcoursArtifact): JudgeCause | "indecis" | null => {
  const causes = (artifact.judgeRuns ?? []).map((run) => run.output.cause).filter((cause): cause is JudgeCause => Boolean(cause));
  if (causes.length === 0) return null;
  if (causes.length === 1) return causes[0];
  return causes[0] === causes[1] ? causes[0] : "indecis";
};

const jaccard = (a: string[], b: string[]): number => {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  return [...left].filter((value) => right.has(value)).length / union.size;
};

const summarize = (values: number[]) => ({ mean: mean(values), min: min(values), stddev: stddev(values) });

export const aggregate = (artifacts: ParcoursArtifact[]): CampaignMetrics => {
  const successful = artifacts.filter((artifact) => artifact.status === "success");
  const verdicts = successful.map((artifact) => artifact.verdict).filter((value): value is number => typeof value === "number");
  const coherence = successful.map((artifact) => averageJudgeScore(artifact, "coherence")).filter((value): value is number => typeof value === "number");
  const homogeneite = successful.map((artifact) => averageJudgeScore(artifact, "homogeneite")).filter((value): value is number => typeof value === "number");
  const geo = successful.map((artifact) => artifact.deterministic?.geo).filter((value): value is number => typeof value === "number");
  const format = successful.map((artifact) => artifact.deterministic?.format).filter((value): value is number => typeof value === "number");

  const bySegment: CampaignMetrics["bySegment"] = {};
  for (const artifact of successful) {
    const bucket = bySegment[artifact.parcours.segment] ?? { count: 0, verdictMean: null };
    const segmentVerdicts = successful.filter((candidate) => candidate.parcours.segment === artifact.parcours.segment).map((candidate) => candidate.verdict).filter((value): value is number => typeof value === "number");
    bySegment[artifact.parcours.segment] = { count: bucket.count + 1, verdictMean: mean(segmentVerdicts) };
  }

  const causes: Record<string, number> = {};
  for (const artifact of successful) {
    const cause = majorityCause(artifact);
    if (cause) causes[cause] = (causes[cause] ?? 0) + 1;
  }

  const twoRunArtifacts = successful.filter((artifact) => (artifact.judgeRuns?.length ?? 0) >= 2);
  const coherenceDiffs = twoRunArtifacts.map((artifact) => Math.abs(artifact.judgeRuns![0].output.coherence.score - artifact.judgeRuns![1].output.coherence.score));
  const homogeneiteDiffs = twoRunArtifacts.map((artifact) => Math.abs(artifact.judgeRuns![0].output.homogeneite.score - artifact.judgeRuns![1].output.homogeneite.score));
  const jaccards = twoRunArtifacts.map((artifact) => jaccard(artifact.judgeRuns![0].output.coherence.missionIdsPertinents ?? [], artifact.judgeRuns![1].output.coherence.missionIdsPertinents ?? []));

  const parcoursWithViolation = successful.filter((artifact) => (artifact.deterministic?.gateViolations.length ?? 0) > 0).length;
  const missionViolations = successful.reduce((sum, artifact) => sum + (artifact.deterministic?.gateViolations.length ?? 0), 0);
  const totalMissions = successful.reduce((sum, artifact) => sum + (artifact.missions?.length ?? 0), 0);

  return {
    totalParcours: artifacts.length,
    successfulParcours: successful.length,
    failedParcours: artifacts.length - successful.length,
    criteria: {
      verdict: summarize(verdicts),
      coherence: summarize(coherence),
      homogeneite: summarize(homogeneite),
      geo: summarize(geo),
      format: summarize(format),
    },
    bySegment,
    belowFourRate: verdicts.length ? verdicts.filter((value) => value < 4).length / verdicts.length : null,
    causes,
    orderSensitivity: {
      coherenceAbsDiffMean: mean(coherenceDiffs),
      homogeneiteAbsDiffMean: mean(homogeneiteDiffs),
      missionsPertinentesJaccardMean: mean(jaccards),
    },
    gates: {
      parcoursWithViolationRate: successful.length ? parcoursWithViolation / successful.length : null,
      missionViolations,
      totalMissions,
    },
  };
};

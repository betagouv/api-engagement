import type { CampaignMetrics, JudgeCause, MatchItem, ParcoursArtifact, Segment } from "./types";

const mean = (values: number[]): number | null => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const min = (values: number[]): number | null => (values.length ? Math.min(...values) : null);
const stddev = (values: number[]): number | null => {
  const avg = mean(values);
  if (avg == null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
};
const roundToHalf = (value: number): number => Math.round(value * 2) / 2;

export const averageJudgeScore = (artifact: ParcoursArtifact, key: "coherence" | "homogeneite"): number | null => {
  const scores = artifact.judgeRuns?.map((run) => run.output[key].score) ?? [];
  const avg = mean(scores);
  return avg == null ? null : roundToHalf(avg);
};

const computeWeightedVerdict = (coherence: number, homogeneite: number, geo: number | null, format: number): number => {
  const weights = geo == null ? { coherence: 0.4 / 0.7, format: 0.2 / 0.7, homogeneite: 0.1 / 0.7, geo: 0 } : { coherence: 0.4, geo: 0.3, format: 0.2, homogeneite: 0.1 };
  return weights.coherence * coherence + weights.geo * (geo ?? 0) + weights.format * format + weights.homogeneite * homogeneite;
};

const computeRunVerdict = (artifact: Pick<ParcoursArtifact, "deterministic" | "judgeRuns">, runIndex: number): number | null => {
  if (!artifact.deterministic || !artifact.judgeRuns?.[runIndex]) return null;
  if (artifact.deterministic.gateViolations.length > 0) return 1;
  const run = artifact.judgeRuns[runIndex];
  return roundToHalf(computeWeightedVerdict(run.output.coherence.score, run.output.homogeneite.score, artifact.deterministic.geo, artifact.deterministic.format));
};

export const computeVerdict = (artifact: Pick<ParcoursArtifact, "deterministic" | "judgeRuns">): number | null => {
  if (!artifact.deterministic || !artifact.judgeRuns?.length) return null;
  if (artifact.deterministic.gateViolations.length > 0) return 1;
  const coherence = mean(artifact.judgeRuns.map((run) => run.output.coherence.score));
  const homogeneite = mean(artifact.judgeRuns.map((run) => run.output.homogeneite.score));
  if (coherence == null || homogeneite == null) return null;
  return roundToHalf(computeWeightedVerdict(coherence, homogeneite, artifact.deterministic.geo, artifact.deterministic.format));
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
const summarizeRounded = (values: number[]) => ({ mean: mean(values), min: min(values), stddev: stddev(values) });

const tagValues = (mission: MatchItem): string[] =>
  mission.match.values
    .filter((value) => !["tranche_age", "dispositif"].includes(value.taxonomyKey))
    .map((value) => `${value.taxonomyKey}:${value.taxonomyValueKey}`)
    .sort();

const computeDispersion = (artifact: ParcoursArtifact): { cohesionTags: number; concentrationTags: number } | null => {
  if (artifact.parcours.id.includes("sans-signal")) return null;
  const missionTagSets = (artifact.missions ?? []).map((mission) => tagValues(mission)).filter((values) => values.length > 0);
  if (missionTagSets.length === 0) return null;

  const pairwiseSimilarities: number[] = [];
  for (let left = 0; left < missionTagSets.length; left += 1) {
    for (let right = left + 1; right < missionTagSets.length; right += 1) {
      pairwiseSimilarities.push(jaccard(missionTagSets[left], missionTagSets[right]));
    }
  }

  const counts = new Map<string, number>();
  for (const values of missionTagSets) {
    for (const value of new Set(values)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const maxShare = Math.max(...counts.values()) / missionTagSets.length;

  return {
    cohesionTags: roundToHalf(1 + 4 * (mean(pairwiseSimilarities) ?? 1)),
    concentrationTags: roundToHalf(1 + 4 * maxShare),
  };
};

const territory = (artifact: ParcoursArtifact): "urbain" | "rural" => {
  if (artifact.parcours.id.includes("rural")) return "rural";
  if (["Aurillac (15)", "Figeac (46)"].includes(artifact.parcours.locationLabel)) return "rural";
  return "urbain";
};

const summarizeGroup = (artifacts: ParcoursArtifact[]) => {
  const verdicts = artifacts.map((artifact) => artifact.verdict).filter((value): value is number => typeof value === "number");
  return {
    count: artifacts.length,
    verdictMean: mean(verdicts),
    acceptableRate: verdicts.length ? verdicts.filter((value) => value >= 4).length / verdicts.length : null,
  };
};

export const aggregate = (artifacts: ParcoursArtifact[]): CampaignMetrics => {
  const successful = artifacts.filter((artifact) => artifact.status === "success");
  const verdicts = successful.map((artifact) => artifact.verdict).filter((value): value is number => typeof value === "number");
  const coherence = successful.map((artifact) => averageJudgeScore(artifact, "coherence")).filter((value): value is number => typeof value === "number");
  const homogeneite = successful.map((artifact) => averageJudgeScore(artifact, "homogeneite")).filter((value): value is number => typeof value === "number");
  const geo = successful.map((artifact) => artifact.deterministic?.geo).filter((value): value is number => typeof value === "number");
  const format = successful.map((artifact) => artifact.deterministic?.format).filter((value): value is number => typeof value === "number");

  const dispersionByParcours = successful.map(computeDispersion).filter((value): value is { cohesionTags: number; concentrationTags: number } => value != null);
  const cohesionTags = dispersionByParcours.map((value) => value.cohesionTags);
  const concentrationTags = dispersionByParcours.map((value) => value.concentrationTags);

  const bySegment = {
    lyceen: summarizeGroup(successful.filter((artifact) => artifact.parcours.segment === "lyceen")),
    etudiant: summarizeGroup(successful.filter((artifact) => artifact.parcours.segment === "etudiant")),
    demandeur_emploi: summarizeGroup(successful.filter((artifact) => artifact.parcours.segment === "demandeur_emploi")),
    actif: summarizeGroup(successful.filter((artifact) => artifact.parcours.segment === "actif")),
    autre: summarizeGroup(successful.filter((artifact) => artifact.parcours.segment === "autre")),
  } satisfies Record<Segment, { count: number; verdictMean: number | null; acceptableRate: number | null }>;

  const byTerritory = {
    urbain: summarizeGroup(successful.filter((artifact) => territory(artifact) === "urbain")),
    rural: summarizeGroup(successful.filter((artifact) => territory(artifact) === "rural")),
  };

  const causes: CampaignMetrics["causesForLowVerdicts"] = { matching: 0, offre: 0, signal: 0, indecis: 0 };
  for (const artifact of successful.filter((candidate) => (candidate.verdict ?? 0) < 4)) {
    const cause = majorityCause(artifact);
    if (cause) causes[cause] += 1;
  }

  const twoRunArtifacts = successful.filter((artifact) => (artifact.judgeRuns?.length ?? 0) >= 2);
  const verdictDiffs = twoRunArtifacts
    .map((artifact) => {
      const firstRunVerdict = computeRunVerdict(artifact, 0);
      const secondRunVerdict = computeRunVerdict(artifact, 1);
      return firstRunVerdict == null || secondRunVerdict == null ? null : Math.abs(firstRunVerdict - secondRunVerdict);
    })
    .filter((value): value is number => typeof value === "number");
  const unstableParcoursCount = verdictDiffs.filter((value) => value > 1).length;

  const parcoursWithViolation = successful.filter((artifact) => (artifact.deterministic?.gateViolations.length ?? 0) > 0).length;
  const missionViolations = successful.reduce((sum, artifact) => sum + (artifact.deterministic?.gateViolations.length ?? 0), 0);
  const totalMissions = successful.reduce((sum, artifact) => sum + (artifact.missions?.length ?? 0), 0);
  const avgDistanceKmTop5 = successful.map((artifact) => artifact.match?.avgDistanceKmTop5).filter((value): value is number => typeof value === "number");

  return {
    totalParcours: artifacts.length,
    successfulParcours: successful.length,
    failedParcours: artifacts.length - successful.length,
    acceptableRate: verdicts.length ? verdicts.filter((value) => value >= 4).length / verdicts.length : null,
    eligibilityViolationRate: successful.length ? parcoursWithViolation / successful.length : null,
    averageScoresByCriterion: {
      verdict: summarize(verdicts),
      coherence: summarize(coherence),
      homogeneite: summarize(homogeneite),
      geo: summarize(geo),
      format: summarize(format),
      cohesion_tags: summarizeRounded(cohesionTags),
      concentration_tags: summarizeRounded(concentrationTags),
    },
    bySegment,
    byTerritory,
    causesForLowVerdicts: causes,
    dispersion: {
      parcoursCount: dispersionByParcours.length,
      cohesionTags: summarizeRounded(cohesionTags),
      concentrationTags: summarizeRounded(concentrationTags),
    },
    avgDistanceKmTop5: summarize(avgDistanceKmTop5),
    judgeStability: {
      unstableParcoursRate: verdictDiffs.length ? unstableParcoursCount / verdictDiffs.length : null,
      unstableParcoursCount,
      totalCompared: verdictDiffs.length,
      thresholdExceeded: verdictDiffs.length ? unstableParcoursCount / verdictDiffs.length > 0.2 : false,
      verdictRunDiffMean: mean(verdictDiffs),
    },
    gates: {
      parcoursWithViolationRate: successful.length ? parcoursWithViolation / successful.length : null,
      missionViolations,
      totalMissions,
    },
  };
};

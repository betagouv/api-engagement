import type { CampaignMetrics, ParcoursArtifact } from "./types";
import { averageJudgeScore } from "./metrics";

const fmt = (value: number | null | undefined): string => (typeof value === "number" ? value.toFixed(2) : "n/a");
const pct = (value: number | null | undefined): string => (typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "n/a");
const escapeMarkdownTableCell = (value: string): string => value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const ratingScale = "Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.";
const aggregationRule = "Regle d'agregation: le verdict retenu par parcours est la moyenne des 2 runs juge, arrondie au demi-point. Si plus de 20% des parcours ont un ecart > 1 entre les 2 verdicts de run, le juge est considere instable.";

const getEngineVersion = (artifact: ParcoursArtifact): string => artifact.engineVersion ?? artifact.match?.engineVersion ?? "non renseignee";

const metricTable = (metrics: CampaignMetrics): string => {
  const rows = Object.entries(metrics.averageScoresByCriterion).map(([name, values]) => `| ${escapeMarkdownTableCell(name)} | ${fmt(values.mean)} | ${fmt(values.min)} | ${fmt(values.stddev)} |`);
  return ["| Critere | Moyenne | Min | Ecart-type |", "|---|---:|---:|---:|", ...rows].join("\n");
};

const headlineMetrics = (metrics: CampaignMetrics): string => {
  const stability = metrics.judgeStability.thresholdExceeded ? "INSTABLE" : "OK";
  const rows = [
    ["Taux de parcours acceptables", pct(metrics.acceptableRate), "Métrique de suivi campagne à campagne, verdict global >= 4."],
    ["Taux de violation d'eligibilite", pct(metrics.eligibilityViolationRate), `Objectif 0%; ${metrics.gates.missionViolations}/${metrics.gates.totalMissions} missions_ineligibles.`],
    ["Score moyen par critere", "Voir table criteres", "Moyenne deterministe des 7 criteres sur les parcours reussis."],
    ["Repartition des causes", "Voir table causes", "Comptage matching / offre / signal sur les parcours < 4."],
    ["Indices d'eparpillement calcules", "Voir table dispersion", "Cohesion declaree + concentration calculees sur les tags, hors parcours sans signal."],
    ["Scores par segment", "Voir tables segments", "Moyennes par statut et urbain vs rural."],
    ["Distance moyenne top 5", `${fmt(metrics.avgDistanceKmTop5.mean)} km`, "avgDistanceKmTop5 retourne par le matching, a croiser avec le score geo."],
    ["Stabilite juge", `${stability} (${pct(metrics.judgeStability.unstableParcoursRate)} > 1 point)`, `${metrics.judgeStability.unstableParcoursCount}/${metrics.judgeStability.totalCompared} parcours compares.`],
  ];
  return ["| Metrique | Valeur | Usage |", "|---|---:|---|", ...rows.map(([name, value, usage]) => `| ${escapeMarkdownTableCell(name)} | ${escapeMarkdownTableCell(value)} | ${escapeMarkdownTableCell(usage)} |`)].join("\n");
};

const recommendations = (metrics: CampaignMetrics): string[] => {
  const output: string[] = [];
  const dominantCause = Object.entries(metrics.causesForLowVerdicts).sort((a, b) => b[1] - a[1])[0];
  if (dominantCause) output.push(`Cause majoritaire des parcours faibles: ${dominantCause[0]} (${dominantCause[1]} parcours).`);
  const weakestSegment = Object.entries(metrics.bySegment)
    .filter(([, value]) => value.verdictMean != null)
    .sort((a, b) => (a[1].verdictMean ?? 99) - (b[1].verdictMean ?? 99))[0];
  if (weakestSegment) output.push(`Segment le plus faible: ${weakestSegment[0]} avec un verdict moyen de ${fmt(weakestSegment[1].verdictMean)}.`);
  if ((metrics.gates.parcoursWithViolationRate ?? 0) > 0) output.push(`Priorite gate age: ${metrics.gates.missionViolations} mission(s) en violation sur ${metrics.gates.totalMissions}.`);
  if (output.length === 0) output.push("Aucune alerte automatique majeure sur les seuils agreges.");
  return output;
};

const renderArtifact = (artifact: ParcoursArtifact): string => {
  if (artifact.status === "failed") {
    return [`### ${artifact.parcours.id}`, "", `Version algo: ${getEngineVersion(artifact)}`, ratingScale, `Statut: echec technique`, `Erreur: ${artifact.error ?? "inconnue"}`].join("\n");
  }
  const missions = artifact.missions ?? [];
  const missionRows = missions.map((mission, index) => {
    const distance = mission.mission.remote === "full" || mission.mission.remote === "possible" ? "distance" : fmt(mission.mission.location.distanceKm);
    return `| ${index + 1} | ${escapeMarkdownTableCell(mission.mission.id)} | ${escapeMarkdownTableCell(mission.mission.title)} | ${distance} | ${fmt(mission.match.totalScore)} |`;
  });
  const justifications = (artifact.judgeRuns ?? []).map((run) => `- Run ${run.runIndex}: coherence ${run.output.coherence.score}, homogeneite ${run.output.homogeneite.score}. ${run.output.coherence.justification}`);
  return [
    `### ${artifact.parcours.id}`,
    "",
    `Profil: ${artifact.parcours.label}`,
    `Version algo: ${getEngineVersion(artifact)}`,
    ratingScale,
    `Verdict: ${fmt(artifact.verdict)} | geo ${fmt(artifact.deterministic?.geo)} | format ${fmt(artifact.deterministic?.format)} | coherence ${fmt(averageJudgeScore(artifact, "coherence"))} | homogeneite ${fmt(averageJudgeScore(artifact, "homogeneite"))}`,
    `Distance moyenne top 5: ${fmt(artifact.match?.avgDistanceKmTop5)} km`,
    artifact.parcours.notes?.length ? `Notes: ${artifact.parcours.notes.join(" ")}` : null,
    artifact.deterministic?.gateViolations.length ? `missions_ineligibles: ${artifact.deterministic.gateViolations.map((gate) => gate.missionId).join(", ")}` : "missions_ineligibles: aucune",
    "",
    "| Rang | Mission | Titre | Distance km | Score moteur |",
    "|---:|---|---|---:|---:|",
    ...missionRows,
    "",
    "Justifications juge:",
    ...justifications,
  ]
    .filter((line): line is string => line != null)
    .join("\n");
};

export const renderReport = (metrics: CampaignMetrics, artifacts: ParcoursArtifact[]): string => {
  const segmentRows = Object.entries(metrics.bySegment).map(([segment, value]) => `| ${escapeMarkdownTableCell(segment)} | ${value.count} | ${fmt(value.verdictMean)} | ${pct(value.acceptableRate)} |`);
  const territoryRows = Object.entries(metrics.byTerritory).map(([territory, value]) => `| ${escapeMarkdownTableCell(territory)} | ${value.count} | ${fmt(value.verdictMean)} | ${pct(value.acceptableRate)} |`);
  const causeRows = Object.entries(metrics.causesForLowVerdicts).map(([cause, count]) => `| ${escapeMarkdownTableCell(cause)} | ${count} |`);
  const dispersionRows = [
    `| Cohesion declaree | ${metrics.dispersion.parcoursCount} | ${fmt(metrics.dispersion.cohesionTags.mean)} | ${fmt(metrics.dispersion.cohesionTags.min)} | ${fmt(metrics.dispersion.cohesionTags.stddev)} |`,
    `| Concentration | ${metrics.dispersion.parcoursCount} | ${fmt(metrics.dispersion.concentrationTags.mean)} | ${fmt(metrics.dispersion.concentrationTags.min)} | ${fmt(metrics.dispersion.concentrationTags.stddev)} |`,
  ];
  const engineVersions = Array.from(new Set(artifacts.map(getEngineVersion))).sort().join(", ");
  return [
    "# Rapport evaluation matching",
    "",
    `Parcours: ${metrics.successfulParcours}/${metrics.totalParcours} reussis (${metrics.failedParcours} echecs techniques).`,
    `Version(s) algo: ${engineVersions || "non renseignee"}.`,
    ratingScale,
    aggregationRule,
    "",
    "## Metriques",
    "",
    headlineMetrics(metrics),
    "",
    "## Criteres",
    "",
    metricTable(metrics),
    "",
    "## Causes des parcours < 4",
    "",
    "| Cause | Parcours |",
    "|---|---:|",
    ...causeRows,
    "",
    "## Eparpillement",
    "",
    "| Indice | Parcours | Moyenne | Min | Ecart-type |",
    "|---|---:|---:|---:|---:|",
    ...dispersionRows,
    "",
    "## Segments",
    "",
    "| Segment | Parcours | Verdict moyen | Taux acceptable |",
    "|---|---:|---:|---:|",
    ...segmentRows,
    "",
    "| Territoire | Parcours | Verdict moyen | Taux acceptable |",
    "|---|---:|---:|---:|",
    ...territoryRows,
    "",
    "## Recommandations automatiques",
    "",
    ...recommendations(metrics).map((line) => `- ${line}`),
    "",
    "## Parcours",
    "",
    ...artifacts.map(renderArtifact),
    "",
  ].join("\n");
};

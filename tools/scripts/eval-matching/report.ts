import type { CampaignMetrics, ParcoursArtifact } from "./types";
import { averageJudgeScore } from "./metrics";

const fmt = (value: number | null | undefined): string => (typeof value === "number" ? value.toFixed(2) : "n/a");

const metricTable = (metrics: CampaignMetrics): string => {
  const rows = Object.entries(metrics.criteria).map(([name, values]) => `| ${name} | ${fmt(values.mean)} | ${fmt(values.min)} | ${fmt(values.stddev)} |`);
  return ["| Critere | Moyenne | Min | Ecart-type |", "|---|---:|---:|---:|", ...rows].join("\n");
};

const recommendations = (metrics: CampaignMetrics): string[] => {
  const output: string[] = [];
  const dominantCause = Object.entries(metrics.causes).sort((a, b) => b[1] - a[1])[0];
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
    return [`### ${artifact.parcours.id}`, "", `Statut: echec technique`, `Erreur: ${artifact.error ?? "inconnue"}`].join("\n");
  }
  const missions = artifact.missions ?? [];
  const missionRows = missions.map((mission, index) => {
    const distance = mission.mission.remote === "full" || mission.mission.remote === "possible" ? "distance" : fmt(mission.mission.location.distanceKm);
    return `| ${index + 1} | ${mission.mission.id} | ${mission.mission.title.replace(/\|/g, "\\|")} | ${distance} | ${fmt(mission.match.totalScore)} |`;
  });
  const justifications = (artifact.judgeRuns ?? []).map((run) => `- Run ${run.runIndex}: coherence ${run.output.coherence.score}, homogeneite ${run.output.homogeneite.score}. ${run.output.coherence.justification}`);
  return [
    `### ${artifact.parcours.id}`,
    "",
    `Profil: ${artifact.parcours.label}`,
    `Verdict: ${fmt(artifact.verdict)} | geo ${fmt(artifact.deterministic?.geo)} | format ${fmt(artifact.deterministic?.format)} | coherence ${fmt(averageJudgeScore(artifact, "coherence"))} | homogeneite ${fmt(averageJudgeScore(artifact, "homogeneite"))}`,
    artifact.parcours.notes?.length ? `Notes: ${artifact.parcours.notes.join(" ")}` : null,
    artifact.deterministic?.gateViolations.length ? `Violations de gate: ${artifact.deterministic.gateViolations.map((gate) => gate.missionId).join(", ")}` : "Violations de gate: aucune",
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
  const segmentRows = Object.entries(metrics.bySegment).map(([segment, value]) => `| ${segment} | ${value.count} | ${fmt(value.verdictMean)} |`);
  return [
    "# Rapport evaluation matching",
    "",
    `Parcours: ${metrics.successfulParcours}/${metrics.totalParcours} reussis (${metrics.failedParcours} echecs techniques).`,
    "",
    "## Metriques",
    "",
    metricTable(metrics),
    "",
    `Verdicts < 4: ${fmt(metrics.belowFourRate == null ? null : metrics.belowFourRate * 100)}%`,
    `Gates: ${fmt(metrics.gates.parcoursWithViolationRate == null ? null : metrics.gates.parcoursWithViolationRate * 100)}% parcours avec violation, ${metrics.gates.missionViolations}/${metrics.gates.totalMissions} missions.`,
    `Sensibilite ordre: coherence ${fmt(metrics.orderSensitivity.coherenceAbsDiffMean)}, homogeneite ${fmt(metrics.orderSensitivity.homogeneiteAbsDiffMean)}, Jaccard pertinence ${fmt(metrics.orderSensitivity.missionsPertinentesJaccardMean)}.`,
    "",
    "## Segments",
    "",
    "| Segment | Parcours | Verdict moyen |",
    "|---|---:|---:|",
    ...segmentRows,
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

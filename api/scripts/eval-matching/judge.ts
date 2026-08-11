import { z } from "zod";
import { generateObject } from "ai";

import { ai } from "@/services/ai";

import { seededShuffle } from "./rng";
import type { JudgeOutput, JudgeRunArtifact, MissionWithDetail, Parcours } from "./types";
import { getAnswerValues } from "./validate";

export const JUDGE_MODEL_ID = "gpt-4.1-mini";
const JUDGE_MODEL = ai.model("openai", JUDGE_MODEL_ID);

const judgeSchema = z.object({
  coherence: z.object({
    score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    missionsPertinentes: z.array(z.number().int().min(1).max(5)),
    justification: z.string().min(1),
  }),
  homogeneite: z.object({
    score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    familles: z.array(z.string()),
    justification: z.string().min(1),
  }),
  cause: z.union([z.literal("matching"), z.literal("offre"), z.literal("signal"), z.null()]),
});

const normalizeText = (value: string | null | undefined, maxLength = 1500): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, Math.max(0, lastSpace))} [tronque]`;
};

const dispositifFor = (mission: MissionWithDetail): string => {
  const dispositif = mission.match.values.find((value) => value.taxonomyKey === "dispositif");
  return dispositif?.taxonomyValueLabel ?? dispositif?.taxonomyValueKey ?? mission.detail?.type ?? "non precise";
};

const compensationFor = (mission: MissionWithDetail): string | null => {
  const compensation = mission.mission.compensation ?? mission.detail?.compensation;
  if (!compensation) return null;
  const amount = compensation.amountMax ? `${compensation.amount}-${compensation.amountMax}` : compensation.amount;
  return [amount, compensation.unit, compensation.type].filter(Boolean).join(" ");
};

const profileFor = (parcours: Parcours): string => {
  const parts = [
    `${parcours.label}`,
    `Age: ${parcours.age}`,
    `Statut: ${getAnswerValues(parcours.answers, "statut").join(", ")}`,
    parcours.handicap ? `Handicap: ${parcours.handicap}` : null,
    `Duree(s): ${getAnswerValues(parcours.answers, "type_mission").join(", ")}`,
    `Motivation: ${getAnswerValues(parcours.answers, "motivation").join(", ")}`,
    `Precisions: ${["engagement_intent", "parcoursup_formation", "domaine", "formation_onisep", "competence_rome", "secteur_activite"].flatMap((taxonomy) => getAnswerValues(parcours.answers, taxonomy).map((value) => `${taxonomy}.${value}`)).join(", ")}`,
    `Localisation: ${parcours.locationLabel}`,
  ];
  return parts.filter(Boolean).join("\n");
};

const renderMission = (mission: MissionWithDetail, index: number): string => {
  const description = mission.descriptionMissing ? "Description indisponible: juger sur le titre seul." : normalizeText(mission.detail?.description);
  const location =
    mission.mission.remote === "full" || mission.mission.remote === "possible"
      ? "realisable a distance"
      : `${mission.mission.location.city ?? mission.detail?.location?.city ?? "ville inconnue"}, distance ${
          mission.mission.location.distanceKm == null ? "inconnue" : `${Math.round(mission.mission.location.distanceKm)} km`
        }`;
  const compensation = compensationFor(mission);
  return [
    `${index}. ${mission.mission.title}`,
    `Description: ${description || "Aucune description."}`,
    `Localisation: ${location}`,
    `Dispositif: ${dispositifFor(mission)}`,
    `Rythme: ${mission.mission.schedule ?? mission.detail?.schedule ?? "non precise"}`,
    compensation ? `Compensation: ${compensation}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const systemPrompt = `Tu es evaluateur de pertinence de recommandations de missions de benevolat et d'engagement pour des jeunes.
Juge uniquement sur le titre et la description fournis, sans connaissance externe et sans utiliser de tags d'enrichissement.
Cohérence: nombre de missions pertinentes pour ce profil sur 5. 5 missions pertinentes => 5, 4 => 4, 3 => 3, 2 => 2, 0 ou 1 => 1.
Homogeneite: 5 = 1-2 familles; 4 = 3 familles dont une avec au moins 3 missions; 3 = 3 familles sans majorite; 2 = 4 familles; 1 = 5 missions isolees.
Cause si coherence < 4: matching = missions hors sujet alors que le besoin est clair; offre = rien de mieux ne semble exister dans la zone; signal = reponses trop pauvres pour discriminer.
Retourne strictement le JSON demande. Les missionsPertinentes sont les numeros 1 a 5 de l'ordre presente.`;

export class JudgeClient {
  async judgeParcours(parcours: Parcours, missions: MissionWithDetail[], runIndex: number, campaign: string): Promise<JudgeRunArtifact> {
    const { seed, items } = seededShuffle(missions, `${campaign}:${parcours.id}:run:${runIndex}`);
    const userPrompt = `Profil:\n${profileFor(parcours)}\n\nMissions:\n${items.map(renderMission).join("\n\n")}`;
    let output: JudgeOutput | null = null;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await generateObject({
          model: JUDGE_MODEL,
          schema: judgeSchema,
          temperature: 0,
          system: systemPrompt,
          prompt: userPrompt,
          maxRetries: 0,
        });
        output = result.object as JudgeOutput;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!output) {
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }

    if (parcours.id === "sans-signal") {
      output.homogeneite.score = 5;
      output.homogeneite.justification = "Homogeneite forcee a 5 cote code pour le parcours sans signal.";
    }

    const positionToMissionId = new Map(items.map((mission, index) => [index + 1, mission.mission.id]));
    output.coherence.missionIdsPertinents = output.coherence.missionsPertinentes.map((position) => positionToMissionId.get(position)).filter((id): id is string => Boolean(id));

    return { runIndex, seed, order: items.map((mission) => mission.mission.id), output };
  }
}

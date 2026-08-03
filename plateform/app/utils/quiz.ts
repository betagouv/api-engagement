import { type StepDef, type StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";
import { evalCondition } from "./conditions";

const MOBILITY_RADIUS_KM = {
  pied_transports: 10,
  velo: 20,
  voiture: 50,
} as const;

const getMobilityRadiusKm = (answers: QuizAnswers): number | undefined => {
  const mobilityAnswer = answers.mobilite;
  if (mobilityAnswer?.type !== "options") return undefined;

  const radii = mobilityAnswer.option_ids.map((optionId) => MOBILITY_RADIUS_KM[optionId as keyof typeof MOBILITY_RADIUS_KM]).filter((radius) => radius !== undefined);

  return radii.length > 0 ? Math.max(...radii) : undefined;
};

export function refreshSteps(
  flow: StepDef[],
  currentStepId: StepId,
  answers: QuizAnswers,
): { next: StepDef | null; prev: StepDef | null; current: StepDef | null; steps: StepDef[] } {
  const freshSteps = flow.filter((s) => !s.condition || evalCondition(s.condition, answers));
  const idx = freshSteps.findIndex((s) => s.id === currentStepId);
  const next = freshSteps[idx + 1] ?? null;
  const prev = freshSteps[idx - 1] ?? null;
  const current = freshSteps[idx] ?? null;
  return { next, prev, current, steps: freshSteps };
}

export const buildPayload = (answers: QuizAnswers) => {
  const apiAnswers: Array<{ taxonomy: string; value: string } | { taxonomy: string; params: Record<string, unknown> }> = [];
  const mobilityRadiusKm = getMobilityRadiusKm(answers);

  for (const [, answer] of Object.entries(answers)) {
    if (answer?.type === "params") {
      const params = answer.taxonomy === "location" && mobilityRadiusKm !== undefined ? { ...answer.params, radius_km: mobilityRadiusKm } : answer.params;
      apiAnswers.push({ taxonomy: answer.taxonomy, params });
    } else if (answer?.type === "options") {
      for (const value of answer.option_ids) {
        apiAnswers.push({ taxonomy: answer.taxonomy, value });
      }
    }
  }

  return { answers: apiAnswers };
};

export const isValidAge = (age: unknown, min = 16, max = 99) => {
  if (age === "" || isNaN(Number(age))) return false;
  const numeric = Number(age);
  return numeric >= min && numeric <= max;
};

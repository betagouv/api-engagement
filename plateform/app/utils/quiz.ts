import { type StepDef, type StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";
import { evalCondition } from "./conditions";

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

// Construit le payload /user-scoring à partir des réponses stockées.
// Format de sortie : { taxonomy, value } pour les options, { taxonomy, params } pour les entrées paramétrées.
export const buildPayload = (answers: QuizAnswers, geo: { lat: number; lon: number; label: string } | undefined) => {
  const apiAnswers: Array<{ taxonomy: string; value: string } | { taxonomy: string; params: object }> = [];

  for (const [stepId, answer] of Object.entries(answers)) {
    if (stepId === "age" || stepId === "handicap") continue;
    if (answer?.type === "age_params") {
      apiAnswers.push({ taxonomy: "tranche_age", params: { age: answer.age, handicap: answer.handicap } });
    } else if (answer?.type === "options") {
      for (const optionId of answer.option_ids) {
        const dotIndex = optionId.indexOf(".");
        const taxonomy = optionId.slice(0, dotIndex);
        const value = optionId.slice(dotIndex + 1);
        apiAnswers.push({ taxonomy, value });
      }
    }
  }

  if (geo) {
    apiAnswers.push({ taxonomy: "location", params: { lat: geo.lat, lon: geo.lon, label: geo.label } });
  }

  return { answers: apiAnswers };
};

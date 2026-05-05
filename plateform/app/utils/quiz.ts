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
// Les `option_ids` sont déjà des taxonomy keys (format `namespace.key`) depuis la migration
// vers le catalogue `config/quiz-options` — pas de lookup intermédiaire nécessaire.
// On projette explicitement { lat, lon } pour ne pas envoyer label (champ UI uniquement).
export const buildPayload = (answers: QuizAnswers, geo: { lat: number; lon: number; label?: string } | undefined) => {
  const taxonomyKeys = Object.values(answers).flatMap((a) => (a?.type === "options" ? a.option_ids : []));
  return {
    answers: taxonomyKeys.map((key) => ({ taxonomy_value_key: key })),
    geo: geo ? { lat: geo.lat, lon: geo.lon } : undefined,
  };
};

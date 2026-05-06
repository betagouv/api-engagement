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
// Règles de sérialisation par type :
//   - "params"  → { taxonomy, params } (chaque step inscrit sa propre taxonomy)
//   - "options" → une entrée { taxonomy, value } par option_id (split sur le premier ".")
//   - autres    → non envoyés (numeric = conditions UI, text = champs libres non scorés)
// "handicap" est exclu : sa sémantique est déjà capturée dans answers["tranche_age"].params.handicap.
export const buildPayload = (answers: QuizAnswers) => {
  const apiAnswers: Array<{ taxonomy: string; value: string } | { taxonomy: string; params: Record<string, unknown> }> = [];

  for (const [stepId, answer] of Object.entries(answers)) {
    if (stepId === "handicap") continue;
    if (answer?.type === "params") {
      apiAnswers.push({ taxonomy: answer.taxonomy, params: answer.params });
    } else if (answer?.type === "options") {
      for (const optionId of answer.option_ids) {
        const dot = optionId.indexOf(".");
        apiAnswers.push({ taxonomy: optionId.slice(0, dot), value: optionId.slice(dot + 1) });
      }
    }
  }

  return { answers: apiAnswers };
};

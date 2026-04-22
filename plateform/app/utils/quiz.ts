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

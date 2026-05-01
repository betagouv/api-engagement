import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";

// Les `StepId` dans les types garantissent à la compilation qu'on ne référence pas un step inexistant.
export type Condition =
  | { type: "screen_answer"; screenId: StepId; optionId: string }
  | { type: "any_screen_has_answer"; screenIds: StepId[]; optionId: string }
  | { type: "numeric_range"; screenId: StepId; min?: number; max?: number }
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "not"; condition: Condition };

export const screenAnswer = (screenId: StepId, optionId: string): Condition => ({
  type: "screen_answer",
  screenId,
  optionId,
});

export const anyScreenHasAnswer = (screenIds: StepId[], optionId: string): Condition => ({
  type: "any_screen_has_answer",
  screenIds,
  optionId,
});

export const numericRange = (screenId: StepId, min?: number, max?: number): Condition => ({
  type: "numeric_range",
  screenId,
  min,
  max,
});

export const and = (...conditions: Condition[]): Condition => ({ type: "and", conditions });

export const or = (...conditions: Condition[]): Condition => ({ type: "or", conditions });

export const not = (condition: Condition): Condition => ({ type: "not", condition });

export const evalCondition = (condition: Condition, answers: QuizAnswers): boolean => {
  switch (condition.type) {
    case "screen_answer": {
      const a = answers[condition.screenId];
      return a?.type === "options" && a.option_ids.includes(condition.optionId);
    }
    case "any_screen_has_answer":
      return condition.screenIds.some((id) => {
        const a = answers[id];
        return a?.type === "options" && a.option_ids.includes(condition.optionId);
      });
    case "numeric_range": {
      const a = answers[condition.screenId];
      if (a?.type !== "numeric") return false;
      if (condition.min !== undefined && a.value < condition.min) return false;
      if (condition.max !== undefined && a.value > condition.max) return false;
      return true;
    }
    case "and":
      return condition.conditions.every((c) => evalCondition(c, answers));
    case "or":
      return condition.conditions.some((c) => evalCondition(c, answers));
    case "not":
      return !evalCondition(condition.condition, answers);
  }
};

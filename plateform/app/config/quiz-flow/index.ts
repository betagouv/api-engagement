import { QUIZ_FLOW_Q1 } from "./q1";
import { QUIZ_FLOW_Q2 } from "./q2";
import type { StepDef, StepId } from "./types";

export type { StepDef, StepId } from "./types";

// Registre des versions du parcours quiz, sur le même principe que le PROMPT_REGISTRY
// de l'enrichissement des missions : chaque version est conservée pour pouvoir rollback
// ou comparer les parcours (analytics). Les routes des steps de toutes les versions
// restent enregistrées dans routes.ts.
export const QUIZ_FLOW_REGISTRY = {
  q1: QUIZ_FLOW_Q1,
  q2: QUIZ_FLOW_Q2,
};

export type QuizFlowVersion = keyof typeof QUIZ_FLOW_REGISTRY;

// Identifiant de la version active du parcours — remonté dans les évènements de tracking
// (`quiz_version`). Rollback = revenir à "q1" ici.
export const QUIZ_FLOW_VERSION: QuizFlowVersion = "q2";

export const QUIZ_FLOW: StepDef[] = QUIZ_FLOW_REGISTRY[QUIZ_FLOW_VERSION];

// Définition d'un step — cherche d'abord dans le flow actif (son wording fait foi),
// puis dans les autres versions pour que les steps hors flow actif restent affichables.
export const getStepDef = (id: StepId): StepDef => {
  const step =
    QUIZ_FLOW.find((s) => s.id === id) ??
    Object.values(QUIZ_FLOW_REGISTRY)
      .flat()
      .find((s) => s.id === id);
  if (!step) throw new Error(`Step absent du registre des flows : ${id}`);
  return step;
};

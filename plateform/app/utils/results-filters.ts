import { FILTERS } from "~/config/results-filters";
import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";

// Sélection de valeurs par filtre (option_ids), telle que gérée par le draft des composants de filtres.
export type FilterSelection = Partial<Record<StepId, string[]>>;

// Sélection courante des filtres depuis les réponses du store (option_ids, [] si non répondu).
export function filterSelectionFromAnswers(answers: QuizAnswers): FilterSelection {
  const selection: FilterSelection = {};
  for (const filter of FILTERS) {
    const answer = answers[filter.stepId];
    selection[filter.stepId] = answer?.type === "options" ? answer.option_ids : [];
  }
  return selection;
}

// Un filtre dont la valeur a changé entre deux applications, pour `results_filter.applied`.
export interface FilterChange {
  stepId: StepId;
  // Omis (undefined) quand le filtre était vide avant → clé `previous_value` non envoyée.
  previous?: string | string[];
  // Valeur après changement : `[]` quand le filtre est vidé (jamais undefined, la clé reste envoyée).
  new: string | string[];
}

// Valeur remontée dans le tracking : une seule option → chaîne, sinon tableau ; vide → undefined.
function toFilterValue(optionIds: string[]): string | string[] | undefined {
  if (optionIds.length === 0) return undefined;
  return optionIds.length === 1 ? optionIds[0] : optionIds;
}

// Comparaison ensembliste (l'ordre des option_ids d'un filtre n'est pas significatif).
function sameSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

// Filtres (parmi FILTERS) dont la sélection diffère entre `baseline` et `current`.
export function diffFilterAnswers(baseline: FilterSelection, current: FilterSelection): FilterChange[] {
  const changes: FilterChange[] = [];
  for (const filter of FILTERS) {
    const previous = baseline[filter.stepId] ?? [];
    const next = current[filter.stepId] ?? [];
    if (sameSelection(previous, next)) continue;
    changes.push({ stepId: filter.stepId, previous: toFilterValue(previous), new: toFilterValue(next) ?? [] });
  }
  return changes;
}

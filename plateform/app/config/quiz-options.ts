import { getTaxonomyList, type TaxonomyValueKey } from "@engagement/taxonomy";
import type { StepOption } from "~/types/quiz";

// Catalogue global des options de réponse, indexé par `taxonomyKey`.
// Les options sont générées depuis le package partagé pour éviter les duplications
// et garder la liste alignée avec les clés envoyées à l'API.

const TAXONOMY_OPTIONS = Object.fromEntries(
  getTaxonomyList().flatMap((taxonomy) =>
    taxonomy.values.map((value) => {
      const key = `${taxonomy.key}.${value.key}` as TaxonomyValueKey;
      return [key, { label: value.label, sublabel: value.sublabel, icon: value.icon, taxonomy: taxonomy.key, value: value.key, disabled: value.disabled }];
    }),
  ),
) as Record<TaxonomyValueKey, StepOption>;

// Réponses propres au quiz : une carte distincte dans le parcours, mais mappée sur une valeur de
// taxonomie existante via `taxonomyValue`. Pas de nouvelle valeur côté API, pas d'enrichissement
// mission à relancer. Leur identifiant reste distinct pour que la sélection et le tracking les
// séparent de la réponse qui porte la même valeur de scoring.
const QUIZ_ONLY_OPTIONS = {
  "motivation_recherche.parcoursup": {
    label: "Je veux enrichir mon dossier Parcoursup",
    icon: "🎓",
    taxonomy: "motivation_recherche",
    value: "parcoursup",
    taxonomyValue: "premiere_experience",
  },
} satisfies Record<string, StepOption>;

export type QuizOptionKey = TaxonomyValueKey | keyof typeof QUIZ_ONLY_OPTIONS;

export const OPTIONS = { ...TAXONOMY_OPTIONS, ...QUIZ_ONLY_OPTIONS } as Record<QuizOptionKey, StepOption>;

// Valeur de taxonomie visée par une réponse du quiz : l'identifiant de l'option, sauf pour les
// réponses propres au quiz qui pointent vers une valeur existante.
export const getTaxonomyValue = (taxonomy: string, optionId: string) => OPTIONS[`${taxonomy}.${optionId}` as QuizOptionKey]?.taxonomyValue ?? optionId;

// Sous-titre affiché dans les cartes d'options grisées (cf. `StepOption.disabled`).
export const DISABLED_OPTION_HINT = "Ces options seront bientôt disponibles";

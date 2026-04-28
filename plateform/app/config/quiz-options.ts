import { getTaxonomyList, type TaxonomyValueKey } from "@engagement/taxonomy";
import type { StepOption } from "~/types/quiz";

// Catalogue global des options de réponse, indexé par `taxonomyKey`.
// Les options sont générées depuis le package partagé pour éviter les duplications
// et garder la liste alignée avec les clés envoyées à l'API.

export const OPTIONS = Object.fromEntries(
  getTaxonomyList().flatMap((taxonomy) =>
    taxonomy.values.map((value) => {
      const key = `${taxonomy.key}.${value.key}` as TaxonomyValueKey;
      const label = value.icon ? `${value.icon} ${value.label}` : value.label;

      return [key, { label, sublabel: value.sublabel, taxonomyKey: key }];
    }),
  ),
) as Record<TaxonomyValueKey, StepOption>;

export type QuizOptionKey = TaxonomyValueKey;

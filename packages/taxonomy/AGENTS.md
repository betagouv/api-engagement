# Instructions agent (API Engagement / `packages/taxonomy`)

Ce fichier précise les règles propres à `@engagement/taxonomy`. Les conventions communes aux packages sont dans `../AGENTS.md`.

## Rôle du package

`@engagement/taxonomy` est la source unique de vérité pour les taxonomies utilisées par le quiz, l’enrichissement de missions et le matching.

Structure :

- `src/taxonomy.ts` : définition canonique des taxonomies, valeurs, libellés, flags `enrichable` / `gate` et transformers éventuels.
- `src/types.ts` : types dérivés de `TAXONOMY` (`TaxonomyKey`, `TaxonomyValueKey`, etc.).
- `src/utils.ts` : helpers runtime pour parser, valider et exposer les taxonomies.
- `src/transformers/` : transformations de paramètres utilisateur vers valeurs de taxonomie.
- `src/index.ts` : point d’entrée public du package.

## Conventions de taxonomie

- Modifier `src/taxonomy.ts` comme source de vérité ; ne pas dupliquer les clés dans les apps.
- Les clés de taxonomie et de valeur sont des identifiants techniques stables : les renommer casse les données, scores, filtres et payloads existants.
- Les libellés, `sublabel` et icônes peuvent évoluer plus librement que les clés, mais vérifier l’impact UI.
- `enrichable: true` signifie que la valeur peut être prédite par l’enrichissement de missions.
- `gate: true` signifie filtre dur côté matching ; ne l’activer que si les consommateurs de scoring/matching sont prêts.
- Les valeurs `hidden: true` peuvent servir au scoring sans être affichées dans les UIs.

## Transformers

Les transformers convertissent des `params` utilisateur vers une ou plusieurs valeurs calculées.

- Valider strictement l’entrée `unknown` au runtime avant de produire une valeur.
- Lever une erreur explicite si les paramètres sont invalides.
- Retourner des clés existantes dans la taxonomie concernée.
- Garder les transformers purs et déterministes.
- Ne pas introduire d’appel réseau, de dépendance à la date courante ou de dépendance applicative.

## Helpers publics

- `parseTaxonomyValueKey()` parse une clé plate `taxonomie.valeur` sans valider son existence.
- `isValidTaxonomyValueKey()` valide une clé plate contre `TAXONOMY`.
- `getTaxonomyList()` fournit une forme prête à l’affichage.
- Les nouveaux helpers exportés doivent passer par `src/index.ts`.

## Ajouter ou modifier une taxonomie

1. Modifier `src/taxonomy.ts`.
2. Ajouter un transformer dans `src/transformers/` si la taxonomie est de type `value` ou dérivée de `params`.
3. Vérifier les types dérivés dans `src/types.ts`.
4. Adapter les usages dans `plateform/app/config/quiz-options.ts`, les steps du quiz, l’API de scoring/enrichment et les DTOs si nécessaire.
5. Lancer `npm --workspace=@engagement/taxonomy run build`.

## Points d’attention

- Les taxonomies alimentent à la fois l’affichage et le matching : un changement apparemment cosmétique peut modifier les résultats si une clé ou un flag change.
- Les flags `enrichable` doivent rester cohérents entre la taxonomie et les prompts/services d’enrichissement côté API.
- Ajouter une valeur non enrichissable comme `je_ne_sais_pas` doit généralement utiliser `enrichable: false`.

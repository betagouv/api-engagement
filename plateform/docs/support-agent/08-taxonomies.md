# Taxonomies

## Rôle

Les taxonomies constituent le vocabulaire partagé entre le quiz, le scoring utilisateur, l'enrichissement des missions, les filtres et le matching. Une valeur est identifiée par la forme `taxonomie.valeur`. Le package partagé fournit la liste, les libellés, sous-libellés, icônes et indicateurs d'activation.

Le catalogue global d'options du quiz est généré depuis ce package. Une valeur `disabled` reste visible dans les écrans qui la sélectionnent mais n'est pas sélectionnable ; l'interface indique que ces options seront bientôt disponibles. Dans le catalogue de missions, une valeur `hidden` n'est pas proposée comme filtre.

## Usages dans le quiz

- `tranche_age` est résolue à partir des paramètres d'âge et de handicap.
- `handicap`, `statut`, `type_mission` et `motivation` structurent les premières réponses.
- `location` utilise des paramètres géographiques.
- `engagement_intent`, `domaine`, `formation_onisep`, `competence_rome`, `secteur_activite`, `servir_pays` et `region_internationale` sont alimentées par les étapes de précision.

Les réponses multi-sélection produisent une entrée de scoring distincte par valeur. Les réponses paramétrées sont transformées côté service de scoring par les transformers du package lorsque la taxonomie le prévoit.

## Usages dans le matching

Les taxonomies enrichissables peuvent contribuer au score lorsqu'elles sont déclarées dans la version active du moteur. Les gates contrôlent l'éligibilité sans poids de ranking. L'ajout d'une taxonomie au référentiel global ne l'active pas automatiquement dans une version du matching : elle doit être ajoutée explicitement à sa configuration.

## Sources

- `packages/taxonomy/src/taxonomy.ts`
- `packages/taxonomy/src/types.ts`
- `packages/taxonomy/src/utils.ts`
- `packages/taxonomy/src/transformers/tranche-age.ts`
- `plateform/app/config/quiz-options.ts`
- `api/src/services/matching-engine/config.ts`

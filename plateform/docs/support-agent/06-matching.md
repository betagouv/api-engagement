# Matching

## Résultats affichés

La première requête demande treize résultats : les cinq premiers forment les missions épinglées et les huit suivants la première page des autres missions. Les pages suivantes demandent huit missions avec un offset égal à `5 + (page - 1) × 8`. La présence potentielle d'une page suivante est déduite du fait que huit éléments ont été retournés.

La première page est mise en cache en mémoire par `userScoringId`. Une erreur supprime l'entrée du cache pour permettre un nouvel essai. Une mise à jour du scoring invalide explicitement ce cache.

## Versions du moteur

Le code définit les versions `m1`, `m2`, `m3` et `m4`. La version par défaut est `m3`. Une valeur de configuration inconnue provoque un signalement puis un retour à `m3`.

Les versions `m1` à `m3` pondèrent de manière égale les taxonomies `domaine`, `secteur_activite`, `type_mission`, `competence_rome`, `region_internationale`, `engagement_intent` et `formation_onisep`. Le poids géographique vaut `0.7` dans `m1`, puis `0.3` dans `m2` et `m3`.

`m3` attribue un score géographique naturel de `0.9` aux missions entièrement à distance et de `0.95` aux missions de type `remote=local`. `m4` reprend cette géographie et ajoute les taxonomies `domaine_engagement`, `rythme`, `activite`, `equipe`, `interaction`, `autonomie`, `imprevu` et `motivation_recherche`, toutes avec un poids de 1.

## Taxonomies et gates

Les taxonomies pondérées contribuent au classement. Les taxonomies déclarées comme gates sont ajoutées aux clés actives pour filtrer l'éligibilité, sans contribuer au score pondéré. La configuration refuse qu'une gate reçoive un poids de ranking.

Sur une requête de première page, le moteur calcule au moins vingt résultats afin de persister les vingt premiers, même si la limite demandée est inférieure. La réponse au client reste tronquée à la limite demandée. Le contrôleur public accepte une limite de 1 à 100 et un offset positif ou nul. La réponse expose le temps de calcul, la version effectivement utilisée, le total avant pagination et, sur la première page lorsqu'une localisation est disponible, la distance moyenne des cinq premières missions.

## Sources

- `plateform/app/services/matching.ts`
- `plateform/app/hooks/useMissionResults.ts`
- `packages/dto/src/resources/mission-match.ts`
- `api/src/services/matching-engine/config.ts`
- `api/src/services/matching-engine/index.ts`
- `api/src/services/mission-match/index.ts`

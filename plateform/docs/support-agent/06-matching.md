# Matching

## Résultats affichés

La première requête demande treize résultats : les cinq premiers forment les missions épinglées et les huit suivants la première page des autres missions. Les pages suivantes demandent huit missions avec un offset égal à `5 + (page - 1) × 8`. La présence potentielle d'une page suivante est déduite du fait que huit éléments ont été retournés.

La première page est mise en cache en mémoire par `userScoringId`. Une erreur supprime l'entrée du cache pour permettre un nouvel essai. Une mise à jour du scoring invalide explicitement ce cache.

## Versions du moteur

Le code définit les versions `m1`, `m2`, `m3`, `m4`, et `m5`. La version active est `m5`. Une valeur de configuration inconnue provoque un signalement puis un retour à `m3`.

La version `m5` est identique à `m4`, mais le score de proximité forcé des missions entièrement à distance (`remote=full`) n'est accordé qu'aux utilisateurs ayant coché « je veux participer à distance ». Les autres reçoivent un score géographique de 0 sur ces missions.

## Taxonomies et gates

Les taxonomies pondérées contribuent au classement. Les taxonomies déclarées comme gates sont ajoutées aux clés actives pour filtrer l'éligibilité, sans contribuer au score pondéré. La configuration refuse qu'une gate reçoive un poids de ranking.

Sur une requête de première page, le moteur calcule au moins vingt résultats afin de persister les vingt premiers, même si la limite demandée est inférieure. La réponse au client reste tronquée à la limite demandée. Le contrôleur public accepte une limite de 1 à 100 et un offset positif ou nul. La réponse expose le temps de calcul, la version effectivement utilisée, le total avant pagination et, sur la première page lorsqu'une localisation est disponible, la distance moyenne des cinq premières missions.

## Calcul du score

### Formule de calcul

Le score total d'une mission est une combinaison pondérée des scores de taxonomie et du score géographique. La formule est la suivante :

1. **Score de taxonomie** : Chaque taxonomie matchée contribue au score selon un socle de base (`taxonomyOrBaseScore`) et une part restante liée à la qualité intra-taxonomie. Pour `m5`, le socle est de `0.5`. La qualité intra-taxonomie est calculée en fonction des valeurs matchées par rapport aux valeurs possibles, pondérée par le poids de la taxonomie.

2. **Score géographique** : Le score géographique est pondéré par `geoWeight`. Pour `m5`, ce poids est de `0.3`. Les missions `remote=full` et `remote=local` reçoivent des scores géographiques fixes de `0.9` et `0.95` respectivement, mais le score `remote=full` est conditionné par l'intention de l'utilisateur de participer à distance.

3. **Normalisation** : Le score total est normalisé par la somme des poids actifs des taxonomies et du poids géographique.

### Pondérations `taxonomyWeights` pour `m5`

- `domaine`: 1
- `secteur_activite`: 1
- `type_mission`: 1
- `competence_rome`: 1
- `region_internationale`: 1
- `engagement_intent`: 1
- `formation_onisep`: 1
- `domaine_engagement`: 1.5
- `rythme`: 1.2
- `activite`: 1.5
- `equipe`: 0.6
- `interaction`: 0.6
- `autonomie`: 0.6
- `imprevu`: 0.6
- `motivation_recherche`: 1

### Cas remote

- `remoteFullGeoScore`: 0.9 (conditionné par l'intention de l'utilisateur)
- `remoteLocalGeoScore`: 0.95

### Dénominateur de normalisation

La somme des poids actifs des taxonomies et du poids géographique est utilisée pour normaliser le score total.

## Classement et tie-breakers

Les missions sont classées par score total décroissant. En cas d'égalité de score, les tie-breakers incluent la distance (pour les missions non-remote) et l'ordre de création.

## Sources

- `plateform/app/services/matching.ts`
- `api/src/services/matching-engine/config.ts`
- `api/src/services/matching-engine/index.ts`
- `api/src/services/matching-engine/types.ts`
- `api/src/services/mission-match/index.ts`
- `packages/dto/src/resources/mission-match.ts`

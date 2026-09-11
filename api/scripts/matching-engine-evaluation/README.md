# Évaluation du matching engine

Ce script vérifie automatiquement que chaque profil retrouve les valeurs de taxonomie attendues dans son top 10.

## Fichier de profils

Copier `profiles.template.json`, puis compléter :

- `userProfile.answers` avec le même format que l'API `user-scoring` ;
- `expected` avec les taxonomies et leurs valeurs attendues.

Exemple :

```json
"expected": [
  {
    "taxonomy": "dispositif",
    "values": [
      { "value": "benevolat", "min": 3 },
      { "value": "service_civique", "min": 1 },
      { "value": "sapeurs_pompiers", "min": 0, "max": 0 }
    ]
  }
]
```

Chaque valeur définit un nombre minimal et maximal d'occurrences dans le top 10 :

- `min: 1` signifie « au moins une mission » ;
- `min: 3` signifie « au moins trois missions » ;
- `min: 0, max: 0` signifie « aucune mission » ;
- `min: 1, max: 2` signifie « entre une et deux missions incluses ».

Le rapport indique le nombre observé ainsi que toutes les positions correspondantes. D'autres taxonomies peuvent être ajoutées dans `expected` avec le même format.

En cas d'échec, le script recherche aussi le premier candidat utile dans une fenêtre bornée du classement :

- si le minimum n'est pas atteint, la première mission correspondante parmi les 50 résultats suivant le top 10, soit jusqu'au rang 60 ;
- si le maximum est dépassé, la première mission correspondante déjà présente dans le top 10.

Le champ `failureCandidate` du rapport JSON contient son rang, son score global, ses composantes de score et `scoreGapToTop10`, soit l'écart avec le score de la mission classée 10e. Il vaut `null` lorsqu'aucune mission correspondante n'est trouvée dans la fenêtre analysée. `failureCandidateSearchComplete` permet de distinguer un corpus entièrement parcouru d'une recherche arrêtée au rang indiqué par `failureCandidateSearchMaxPosition`. Cette recherche supplémentaire n'exécute qu'un seul recalcul, uniquement pour les attentes en échec, et ne modifie pas leur verdict.

## Exécution

Depuis `api/` :

```bash
npx ts-node scripts/matching-engine-evaluation/evaluate.ts --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5
```

Pour n'évaluer qu'un profil du fichier :

```bash
npx ts-node scripts/matching-engine-evaluation/evaluate.ts --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m5 --profile-id L4
```

La valeur de `--profile-id` doit correspondre exactement au champ `id` d'un profil. Si elle est inconnue, le script affiche les identifiants disponibles et s'arrête.

Pour obtenir un rapport JSON exploitable par un autre outil :

```bash
npx ts-node scripts/matching-engine-evaluation/evaluate.ts --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5 --json
```

Pour valider uniquement le fichier sans écrire en base ni exécuter le moteur :

```bash
npx ts-node scripts/matching-engine-evaluation/evaluate.ts --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5 --validate-only
```

La position est numérotée à partir de 1. `firstPosition` vaut `null`, `positions` est vide et `count` vaut `0` lorsque la valeur est absente du top 10. Une absence est considérée comme réussie lorsque la condition attendue est `min: 0, max: 0`. `tookMs` reste la durée du calcul du top 10 ; `diagnosticTookMs` et `diagnosticCandidatesScanned` mesurent séparément le coût de la recherche déclenchée par les échecs.

Le script réutilise `userScoringService` et `matchingEngineService`. Il crée un `user_scoring` temporaire pour chaque profil, désactive la persistance des `mission_matching_result`, puis supprime le profil dans un bloc `finally`.

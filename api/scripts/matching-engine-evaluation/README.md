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

## Exécution

Depuis `api/` :

```bash
npm run evaluate:matching -- --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5
```

Pour obtenir un rapport JSON exploitable par un autre outil :

```bash
npm run --silent evaluate:matching -- --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5 --json
```

Pour valider uniquement le fichier sans écrire en base ni exécuter le moteur :

```bash
npm run evaluate:matching -- --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5 --validate-only
```

La position est numérotée à partir de 1. `firstPosition` vaut `null`, `positions` est vide et `count` vaut `0` lorsque la valeur est absente du top 10. Une absence est considérée comme réussie lorsque la condition attendue est `min: 0, max: 0`.

Le script réutilise `userScoringService` et `matchingEngineService`. Il crée un `user_scoring` temporaire pour chaque profil, désactive la persistance des `mission_matching_result`, puis supprime le profil dans un bloc `finally`.

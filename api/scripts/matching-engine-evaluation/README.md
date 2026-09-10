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
    "values": ["benevolat", "service_civique", "sapeurs_pompiers"]
  }
]
```

Chaque valeur est validée dès qu'au moins une mission correspondante apparaît dans le top 10. Le rapport indique toutes les positions auxquelles elle apparaît. D'autres taxonomies pourront être ajoutées dans `expected` sans modifier ce format.

Lorsque plusieurs valeurs sont interchangeables, utiliser une liste imbriquée. Au moins une valeur de cette liste doit être présente :

```json
"expected": [
  {
    "taxonomy": "dispositif",
    "values": [
      "benevolat",
      "service_civique",
      ["sapeurs_pompiers", "reserve_gendarmerie", "reserve_police_nationale"]
    ]
  }
]
```

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

La position est numérotée à partir de 1. `firstPosition` vaut `null` et `positions` est vide lorsque la valeur est absente du top 10.

Le script réutilise `userScoringService` et `matchingEngineService`. Il crée un `user_scoring` temporaire pour chaque profil, désactive la persistance des `mission_matching_result`, puis supprime le profil dans un bloc `finally`.

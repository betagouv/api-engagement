---
description: Mock local de l'API publique pour les recettes partenaires hors internet
---

# Mock offline

Une archive Mockoon est disponible pour les partenaires qui doivent tester leur integration dans un environnement deconnecte d'internet.

Elle contient un mock local de l'API publique, les fichiers necessaires au lancement Docker, un smoke test et la specification OpenAPI.

## Telechargement

La derniere archive est publiee avec les releases GitHub :

```text
https://github.com/betagouv/api-engagement/releases/latest/download/api-engagement-mockoon-api-v1.tar.gz
```

Le nom de l'archive est versionne par version majeure de l'API, lue depuis `api/package.json`.

## Contrat API

Le contrat detaille des endpoints, schemas et erreurs reste documente dans cette documentation et dans la specification OpenAPI :

```text
https://raw.githubusercontent.com/betagouv/api-engagement/main/api/docs/openapi.yaml
```

L'archive inclut egalement ce fichier sous `mockoon/docs/openapi.yaml`.

## Installation

Les instructions d'installation offline sont dans le README inclus dans l'archive.

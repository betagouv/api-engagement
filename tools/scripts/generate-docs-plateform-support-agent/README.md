# Génération de la documentation pour l'agent support

Ce script génère les documents de `plateform/docs/support-agent` à partir des sources déclarées dans `plateform/docs/support-agent/sources.yml`.

## Prérequis

- Node.js 22 ou supérieur ;
- dépendances installées dans `tools/scripts` ;
- variable `OPENAI_API_KEY` disponible dans l'environnement ou dans le fichier local ignoré `tools/scripts/.env`.

Le modèle peut être configuré avec `PLATEFORM_SUPPORT_DOCS_OPENAI_MODEL`. Sa valeur par défaut est `gpt-4o`.

La génération transmet au modèle le contenu des fichiers déclarés comme sources pour chaque chapitre. Son activation en CI doit donc faire l'objet d'une autorisation explicite. Le workflow reste désactivé tant que la variable GitHub `PLATEFORM_SUPPORT_DOCS_EXTERNAL_GENERATION_ENABLED` ne vaut pas `true`.

## Commandes

Depuis `tools/scripts` :

```sh
npm run generate-docs-plateform-support-agent
npm run generate-docs-plateform-support-agent -- --all
npm run check-docs-plateform-support-agent
```

L'option `--all` force la régénération de tous les chapitres. Sans cette option, seuls les documents associés aux sources modifiées depuis le commit enregistré dans le `README.md` sont traités.

Le paramètre `--summary-file <chemin>` produit le résumé utilisé dans le corps de la pull request automatique.

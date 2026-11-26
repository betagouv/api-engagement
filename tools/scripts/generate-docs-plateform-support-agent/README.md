# Génération de la documentation pour l'agent support

Ce script génère les documents de `plateform/docs/support-agent` à partir des sources déclarées dans `plateform/docs/support-agent/sources.yml`.

## Prérequis

- Node.js 22 ou supérieur ;
- dépendances installées dans `tools/scripts` ;
- variable `OPENAI_API_KEY` disponible dans l'environnement ou dans le fichier local ignoré `tools/scripts/.env`.

Le modèle peut être configuré avec `PLATEFORM_SUPPORT_DOCS_OPENAI_MODEL`. Sa valeur par défaut est `gpt-4o`.

La génération transmet au modèle les sources citées par chaque chapitre ainsi que les fichiers fonctionnels modifiés depuis la génération précédente.

## Commandes

Depuis `tools/scripts` :

```sh
npm run generate-docs-plateform-support-agent
npm run generate-docs-plateform-support-agent -- --all
```

L'option `--all` force la régénération de tous les chapitres. Sans cette option, la génération s'arrête lorsqu'aucun fichier du périmètre global n'a changé depuis le commit enregistré dans le `README.md`.

Le paramètre `--summary-file <chemin>` produit un résumé des changements, réutilisable dans le corps d'une pull request. La génération est déclenchée manuellement ; il n'y a pas encore de workflow planifié.

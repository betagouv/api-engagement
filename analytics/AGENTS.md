# Instructions agent (API Engagement / `analytics`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans `analytics/` (jobs + migrations DB + dbt).

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (cohérence dépôt).

## Périmètre et fichiers à ne pas modifier

Éviter d’éditer/committer directement les éléments suivants (générés, dépendances, secrets, artefacts) :

- `node_modules/`, `dist/`
- `.env*` (variables d’environnement : potentiellement sensibles)
- Artefacts dbt : `dbt/**/target/`, `dbt/**/logs/`, `dbt/**/.venv/`, `dbt/**/dbt_packages/`, `dbt/**/.user.yml`

Si une modification nécessite ces fichiers, demander explicitement une validation avant d’aller plus loin.

## Vue d’ensemble

Ce dossier contient :

- des jobs TypeScript qui exportent des données depuis la base core vers la base analytics ;
- la gestion du schéma “raw” via `dbmate` (`db/migrations/`) ;
- un projet dbt (`dbt/analytics/`) pour les transformations/modèles (lint SQLFluff en CI).

Structure notable :

- `src/jobs/run-job.ts` : point d’entrée CLI (charge `.env` ou `.env.<env>`, exécute un handler).
- `src/jobs/` : mini-framework (`base/`) et jobs (ex. `export-to-analytics-raw/`).
- `src/services/process-definition.ts` : boucle d’export incrémental (curseur, batch, upsert, état).
- `src/db/` : clients Postgres core + analytics.
- `scripts/dbt-env.sh` : wrapper pour exécuter dbt à partir de `DATABASE_URL_ANALYTICS`.

## Base de données et migrations (dbmate)

- Les migrations sont dans `db/migrations/` et s’exécutent via `npm run db:migrate`.
- Préférer des changements additifs et rétro-compatibles (nouvelles tables/colonnes, éviter les breaking changes non coordonnés).
- Garder les tables d’ingestion “raw” sous le schéma `analytics_raw` (consommé par les jobs d’export).

## Jobs (conventions)

- Jobs idempotents et relançables (progression via état/curseur).
- Défs d’export petites et bien scindées ; mutualiser la logique réutilisable dans `src/services/`.
- Valider les entrées tôt, échouer vite avec des logs actionnables (sans données sensibles).
- Les erreurs passent par le plumbing existant (Sentry + Slack si configuré).

## Variables d’environnement

Souvent nécessaires :

- `DATABASE_URL_CORE`
- `DATABASE_URL_ANALYTICS`

Optionnel :

- `BATCH_SIZE` (override taille de lot)
- `ENV`, `SENTRY_DSN_JOBS`
- `SLACK_CRON_CHANNEL_ID` (notifications Slack)

## Commandes

Source de vérité : `analytics/package.json`

- Lint : `npm run lint`
- Build : `npm run build`
- Migrations : `npm run db:migrate` / `npm run db:new -- <name>`
- Exécuter un job : `npm run job -- <job-name> <table> [--env <env>]`
- dbt (via wrapper) : `./scripts/dbt-env.sh compile` (et autres commandes dbt)

## Sécurité et données

- Ne jamais committer `.env` ni hardcoder des credentials.
- Les exports analytics peuvent contenir des données sensibles : éviter de logguer des lignes brutes ou des données personnelles.

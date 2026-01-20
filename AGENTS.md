# Instructions agent (API Engagement / racine du dépôt)

Ce fichier décrit les conventions de travail attendues pour intervenir dans l’ensemble du monorepo. Des `AGENTS.md` plus spécifiques peuvent exister dans les sous-dossiers (`api/`, `app/`, `widget/`, `analytics/`) et prennent priorité sur celui-ci.

## Langue

- Rédiger la documentation, et les explications **en français**.
- Les commits, en revanche, doivent suivre les conventions de commits (Conventional Commits) et sont écrits en anglais, tout comme le titre des PR.

## Versionning git

### Branches

- Les branches suivent le format `[nom]/[type]/[sujet]` (ex. `valentin/feature/mon-sujet`).
- Types autorisés : `feat`, `refactor`, `fix`, `chore`, `test`.
- Les branches partent de `staging`.

### Conventions de commits (Conventional Commits)

- Les messages de commit doivent suivre `type(scope): sujet` (72 caractères max pour le sujet).
- Types autorisés : `feat`, `refactor`, `fix`, `chore`, `test`
- Scopes autorisés : `app`, `api`, `analytics`, `widget`, `jobs`, `ci`
- Utiliser Commitizen : `npm run commit`
- Un hook Husky exécute `commitlint` en local (`.husky/commit-msg`).

### Pull requests

- Utiliser le template de PR : `.github/PULL_REQUEST_TEMPLATE.md` (le remplir et adapter les checklists au périmètre).
- Le titre de PR doit suivre les conventions de commits (Conventional Commits), en anglais, tandis que le corps de PR est en français.

## Vue d’ensemble (monorepo)

Ce dépôt regroupe plusieurs applications et l’infra :

- `api/` : API Node.js + TypeScript + Express (voir `api/AGENTS.md` pour les règles détaillées).
- `app/` : back-office (Vite + React) + petit serveur Express pour servir `dist/` en production.
- `widget/` : widgets publics (Next.js, SEO) avec tests E2E Playwright.
- `analytics/` : jobs analytics (TypeScript) + migrations Postgres (dbmate) + modèles dbt.
- `terraform/` : infra as code (déploiement Scaleway via Terraform).

Une orchestration locale est disponible via `docker-compose.yml` (Mongo + 2 Postgres + apps).

## Périmètre et fichiers à ne pas modifier

Éviter d’éditer/committer directement les éléments suivants (générés, dépendances, secrets, artefacts) :

- `**/node_modules/`
- `**/dist/`, `**/build/`, `**/.next/`, `**/out/`
- `**/coverage/`
- `**/.env`, `**/.env.*` (variables d’environnement : potentiellement sensibles)
- Artefacts dbt : `analytics/dbt/**/target/`, `analytics/dbt/**/logs/`, `analytics/dbt/**/.venv/`, `analytics/dbt/**/dbt_packages/`
- Artefacts Playwright : `widget/tests/e2e/_test-results/`, `widget/tests/e2e/_playwright-report/`

Si une modification nécessite ces fichiers, demander explicitement une validation avant d’aller plus loin.

## Workflows (CI/CD)

Workflows GitHub Actions principaux dans `.github/workflows/` :

- `lint.yml` : ESLint (api/widget/analytics) + SQLFluff (modèles dbt) selon les chemins modifiés.
- `tests.yml` : vérifie migrations API (Prisma), migrations analytics (dbmate) + `dbt compile`, tests API, E2E widget (Playwright).
- `build-check.yml` : checks build (TypeScript API/analytics, Vite app, Next widget) selon les chemins modifiés.
- `main-pipeline.yml` : sur push `main`/`staging`, exécute tests → build/push images Docker → déploiement Terraform.
- `docker-build-push.yml` : build + push des images GHCR (`app`, `api`, `analytics`, `widget`) taggées par env + short SHA.
- `terraform-deploy.yml` : déploiement Scaleway via workspaces Terraform (staging/production).
- `pr-title-lint.yml` : validation du titre de PR (types/scopes).
- `changelog.yml` : génération planifiée/manuelle du changelog via `git-cliff` (met à jour `CHANGELOG.md`).

## Commandes (racine)

Source de vérité : `package.json` à la racine :

- Lint : `npm run lint`
- Fix lint (partiel) : `npm run lint:fix`
- Format : `npm run format`
- Commit (Commitizen) : `npm run commit`

## Sécurité (règles de base)

- Ne jamais ajouter de secrets en dur (tokens, credentials, DSN, clés, etc.).
- Ne pas committer de `.env`/`.env.*`.
- Éviter de logguer des données personnelles ; préférer des logs techniques (ids, compteurs, statuts).
- Pour tout comportement destructeur (suppression massive, backfill), proposer un mode dry-run/confirmation si ce n’est pas explicitement demandé.

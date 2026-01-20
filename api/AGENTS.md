# Instructions agent (API Engagement / `api`)

Ce fichier décrit les conventions de travail attendues pour intervenir dans ce répertoire (`api`). Sa portée couvre tout l’arbre du dépôt, sauf indication contraire.

## Langue

- Rédiger la documentation, les messages de PR et les explications **en français** (contexte d’équipe).
- Bonnes pratiques générales : dans un dépôt open-source multi-équipe, l’anglais est souvent privilégié. Ici, le français est accepté/préféré ; garder un vocabulaire simple et cohérent.

## Périmètre et fichiers à ne pas modifier

Éviter d’éditer/committer directement les éléments suivants (générés, dépendances, secrets, artefacts) :

- `node_modules/`
- `dist/`
- `.env`, `.env.*` (variables d’environnement : potentiellement sensibles ; ne modifier que sur demande explicite)
- `coverage/`
- `scripts-local/`
- `src/db/core/`, `src/db/analytics/` (clients Prisma générés ; voir section Prisma)
- `linkedin.xml`, `talent.xml`, `grimpio.xml` (données/exports)

Si une modification nécessite ces fichiers, demander explicitement une validation avant d’aller plus loin.

## Vue d’ensemble (architecture)

Stack principale : Node.js (>= 18), TypeScript, Express, MongoDB (Mongoose), PostgreSQL (Prisma), Vitest (unit + integration).

Structure notable :

- `src/index.ts` : bootstrap Express, routing (v0/v1/v2 + routes internes), middleware, gestion d’erreurs.
- `src/controllers/` : endpoints HTTP utilisés par l'app et le widget (validation `zod`, auth `passport`, orchestration).
- `src/services/` : logique métier, orchestration, mapping, appels externes.
- `src/repositories/` : accès aux données PostgreSQL via Prisma (clients `prismaCore` / `prismaAnalytics`).
- `src/models/` : modèles Mongoose (Mongo) — **héritage voué à disparaître** (voir section MongoDB).
- `src/db/` : connexions DB (Mongo + Postgres) ; les clients Prisma générés sont importés depuis `src/db/{core,analytics}`.
- `src/jobs/` : jobs exécutables via `npm run job` (batch/import/export/maintenance).
- `src/utils/` : helpers génériques (parse/sanitize/cast/format, etc.) à réutiliser en priorité.
- `src/v{0|1|2}` : API versionnée publique, utilisée par les partenaires.
- `scripts/` : scripts **one-shot** (opérations ponctuelles, rattrapage/backfill, maintenance exceptionnelle) ; à distinguer des jobs (voir section dédiée).
- `tests/` : outillage, mocks, fixtures, tests d’intégration (Postgres via testcontainers + migrations Prisma).

## Conventions de code

- TypeScript `strict: true` : éviter `any`, préférer des types dédiés dans `src/types/`.
- Préférer des fonctions et modules petits, cohésifs, avec noms explicites.
- Garder les changements **minimaux et ciblés** (ne pas “refactor” au passage).
- Formatage : utiliser `npm run prettier` si nécessaire.
- Lint : respecter `eslint` ; éviter d’introduire de nouvelles règles ou reformatages massifs.
- Helpers : privilégier les helpers existants dans `src/utils/` (parse/sanitize/cast/format…) plutôt que d’en créer de nouveaux “à la demande”. Ajouter un helper seulement s’il est réellement réutilisable et correctement typé.

### Ajout/modification d’API (Express)

- Les controllers valident systématiquement `req.body/params/query` via `zod` et renvoient des codes d’erreur cohérents.
- Conserver les décisions existantes : routes publiques vs routes internes, `cors` sur certaines routes, `passport.authenticate` pour les routes protégées.
- Politique de versioning : **ne pas changer le format d’API** (v0/v1/v2 inclus) sauf si explicitement demandé par le prompt/ticket. Ajouter plutôt de nouveaux champs optionnels ou de nouveaux endpoints.

### Couche “services” vs “repositories”

Chaîne à privilégier : **controller → service → repository**.

- `controllers` : HTTP uniquement (validation, auth, mapping request/response, codes d’erreurs) ; pas de requêtes DB “directes”.
- `services` : logique métier et orchestration (validation métier, règles, mapping, appels externes) ; ne connaît pas Express.
- `repositories` : accès DB (Prisma) sans logique métier (pas de règles business).

## Base de données

### MongoDB

- Connexion via `src/db/mongo.ts` (Mongoose).
- Les modèles Mongoose sous `src/models/` sont **legacy** et **voués à disparaître** : éviter d’ajouter de nouveaux modèles/collections ou d’étendre le schéma Mongo, sauf demande explicite.
- Les tests d’intégration utilisent `mongodb-memory-server` et nettoient les collections entre tests.

### PostgreSQL / Prisma (règles importantes)

Le projet utilise **2 schémas Prisma** :

- **Core** : `prisma/core/schema.core.prisma` — **source de vérité métier** (à modifier si besoin).
- **Analytics** : `prisma/analytics/schema.analytics.prisma` — **voué à disparaître** (remplacé par un pipeline dbt dans un autre répertoire) : **ne pas modifier** ce schéma ni ses migrations, sauf demande explicite.

Clients Prisma générés :

- Les répertoires `src/db/core/` et `src/db/analytics/` sont générés par `npm run prisma:generate` et sont ignorés par git. Ne pas les éditer.

#### Prisma : repères & conventions (courts)

- **Nommage DB** : les champs Prisma sont en `camelCase` et sont mappés en `snake_case` via `@map("...")`. Les tables utilisent `@@map("...")`. Conserver ce pattern.
- **Identifiants** : la plupart des modèles utilisent `id String @id @default(uuid())` ; rester cohérent sauf contrainte explicite.
- **Timestamps** : standard attendu `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt` (avec `@map("created_at")`, `@map("updated_at")`).
- **Soft delete** : quand un modèle est “supprimable”, privilégier `deletedAt DateTime? @map("deleted_at")` plutôt qu’un hard delete ; s’assurer que les requêtes applicatives filtrent bien `deletedAt = null` par défaut.
- **Index/contraintes** : nommer explicitement les indexes/uniques via `map: "..."` (stabilité des migrations) et ajouter les indexes nécessaires aux parcours réels (ex : `deletedAt`, curseurs/tri, tableaux avec index GIN).
- **Enums** : modifier/renommer des valeurs d’enum est une migration DB + un risque de compatibilité données ; le faire seulement si nécessaire et avec une stratégie de migration.
- **Migrations** : les migrations sont générées via `npm run prisma:migrate:core` et sont rangées dans `prisma/core/migrations/`. Ne pas écrire directement dans les fichiers, et laisser la commande Prisma s'en occuper.

## Tests

- Unit tests : `npm run test:unit` (utilise des mocks, ne dépend pas de Docker).
  - Les tests unitaires correspondant à un fichier en particulier sont rangés dans `__test__/` et nommés `monfichier.spec.ts`.
- Integration tests : `npm run test:integration`
  - Démarre un PostgreSQL via `testcontainers` (Docker requis).
  - Exécute les migrations Prisma en global setup.
  - Utilise un Mongo in-memory.
- Préférer ajouter des tests unitaires pour la logique métier, et des tests d’intégration pour les chemins DB/HTTP critiques.

## Commandes (source de vérité : `package.json`)

- Développement : `npm run dev`
- Build : `npm run build`
- Démarrage : `npm run start`
- Prisma :
  - `npm run prisma:generate`
  - `npm run prisma:migrate:core`
  - `npm run prisma:migrate:analytics` (à éviter sauf demande explicite)
- Jobs : `npm run job -- <job-name> <json-params> --env <env>`
- Qualité : `npm run lint`, `npm run lint:fix`, `npm run prettier`
- Tests : `npm test`, `npm run test:ci`

## Sécurité (règles de base)

- Ne jamais ajouter de secrets en dur (tokens, credentials, DSN, clés S3/Scaleway, etc.).
- Ne pas committer de `.env`/`.env.*` ni de dumps/export contenant des données sensibles.
- Éviter de logguer des données personnelles ; préférer des logs techniques (ids, compteurs, statuts).
- Toute nouvelle dépendance, appel réseau, ou mécanisme crypto/auth doit être justifié et minimal.

## Exigences de travail (pour un agent)

- Respecter l’existant : conventions, structure, scripts npm.
- Ne pas modifier les fichiers ignorés par git (cf. section “Périmètre”).
- Proposer une validation (tests/lint) adaptée aux changements.
- En cas d’ambiguïté fonctionnelle, poser des questions avant d’implémenter.

## Jobs (architecture et conventions)

Les jobs sont des tâches batch/maintenance déclenchées via `npm run job` et structurées sous `src/jobs/`.

Conventions :

- Point d’entrée : `src/jobs/run-job.ts` (sélection du job + parsing des paramètres).
- Organisation : un dossier par job (ex: import/export/backfill) ; mutualiser les helpers dans `src/jobs/base/` si pertinent.
- Paramètres : exposer un schéma de params explicite (zod/typing) et valider tôt ; refuser les entrées ambigües.
- Exécution : privilégier des jobs **idempotents** et relançables ; journaliser des étapes (compteurs, durées, ids), éviter la donnée sensible.
- DB/IO : réutiliser la même discipline que l’API (service/repository) et éviter la logique SQL/Mongo “inline” dans le runner.
- Sécurité : ne pas introduire de comportement destructeur non gardé (suppression massive, backfill) sans dry-run/confirmation si le prompt ne le demande pas.

## Scripts (one-shot)

Les scripts sous `scripts/` sont des opérations **ponctuelles** (one-shot) : backfill, migration de données, renommage, correctifs exceptionnels.

Conventions :

- Les scripts peuvent être plus “opérationnels” que les jobs, mais doivent rester sûrs (validation des entrées, logs non sensibles, mode dry-run si destructif).
- Ils ne constituent pas une surface “métier” long-terme : si une tâche doit tourner régulièrement ou fait partie du comportement attendu, préférer un job dans `src/jobs/`.

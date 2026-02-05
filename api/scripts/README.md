# Scripts API

Ce répertoire contient des scripts de maintenance/migration pour l’API. Les scripts se lancent depuis le dossier `api/`.

## Prérequis généraux

- Node.js 18+
- Accès aux bases et services nécessaires (MongoDB, PostgreSQL, APIs externes)
- Variables d’environnement chargées (fichiers `.env*` ou flags `--env` lorsque disponible)
- Prisma généré quand Postgres est utilisé: `npm run prisma:generate` (dans `api/`)

## Exécution

- Depuis `api/`, utiliser `npx ts-node`:
  - `npx ts-node scripts/<script>.ts [options]`
  - Certains scripts acceptent `--env <chemin_ou_nom>` pour charger un fichier `.env` dédié

## Liste des scripts

- **backfill-publisher-organizations.ts**

  - Exécution: `npx ts-node scripts/backfill-publisher-organizations.ts`
  - Usage: Crée/met à jour les `PublisherOrganization` à partir des champs `organization*` encore présents sur `Mission`.
  - Notes: À exécuter avant la suppression des colonnes `organization*` côté `mission`.

- **mongo-backfill/**

  - Sous-dossier dédié à la migration des modèles MongoDB vers PostgreSQL.
  - Voir `scripts/mongo-backfill/README.md` pour les commandes complètes:
    - Email: `npx ts-node scripts/mongo-backfill/backfill-email.ts [--env <chemin>]`

- **fill-stat-event-updated-at.ts**

  - Exécution: `npx ts-node scripts/fill-stat-event-updated-at.ts [--batch <taille>]`
  - Usage: Met à jour le champ `updated_at` de la table `StatEvent` lorsqu'il est `NULL`, en le remplaçant par `created_at` (traitement par lots).
  - Options: `--batch <taille>` pour définir la taille de lot (défaut: 5000).
  - Prérequis: Nécessite l'accès à Postgres `core`.

- **reconcile-apply-click-ids.ts**

  - Exécution: `npx ts-node scripts/reconcile-apply-click-ids.ts --from <date> [--to <date>] [--dry-run]`
  - Usage: Réconcilie les `click_id` des `stat_event` de type `apply` qui portent un identifiant ElasticSearch (non UUID) en retrouvant le `click` correspondant via `stat_event.es_id`.
  - Options:
    - `--from <date>` (obligatoire) : date de début (ex: `2025-10-01` ou `2025-10-01T00:00:00Z`).
    - `--to <date>` : date de fin (exclusive).
    - `--batch <taille>` : taille de lot (défaut: 500).
    - `--last-id <uuid>` : reprise à partir d’un id `stat_event` core.
    - `--dry-run` : simule les mises à jour et loggue les correspondances.
  - Prérequis: Nécessite l'accès à Postgres `core`.

- **cleanup-duplicate-organizations.ts**

  - Exécution: `npx ts-node scripts/cleanup-duplicate-organizations.ts [--dry-run] [--title "Nom"]`
  - Usage: Supprime les organisations en doublon qui n'ont plus de mission rattachée. Par defaut, suppression directe.
  - Options: `--dry-run` pour simuler, `--title` pour cibler un nom précis.

- **fixtures/**

  - Scripts d’initialisation/d’échantillonnage de données (voir `scripts/fixtures/README.md`), dont:
    - `populate-stat-events-from-missions.ts`: génère des `StatEvent` réalistes pour un ou plusieurs publishers à partir de missions Mongo.

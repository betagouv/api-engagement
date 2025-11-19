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

- **rename-publisher.ts**

  - Exécution: `npx ts-node scripts/rename-publisher.ts <oldName> <newName> [--dry-run]`
  - Usage: Renomme un publisher et propage le changement:
    - MongoDB: `Publisher.name` et `Mission.publisherName`
    - PostgreSQL: colonnes `StatEvent.from_publisher_name` et `StatEvent.to_publisher_name`
  - Options: `--dry-run` pour voir les volumes sans modifier les données.

- **update-mission-default-logo.ts**

  - Exécution: `DB_ENDPOINT="mongodb://..." npx ts-node scripts/update-mission-default-logo.ts`
  - Usage: Applique le `defaultMissionLogo` du publisher aux missions existantes sans `organizationLogo`.
  - Notes: Nécessite l’accès à MongoDB.

- **letudiant/update-piloty-company-logos.ts**

  - Exécution: `npx ts-node scripts/letudiant/update-piloty-company-logos.ts [--env <nom|chemin>] [--limit <n>] [--dry-run]`
  - Usage: Met à jour le logo des entreprises (Piloty) associées aux organisations liées à des missions avec un logo par défaut.
  - Prérequis: `LETUDIANT_PILOTY_TOKEN` (env), accès MongoDB. Respecte un rate-limit simple.

- **letudiant/archive-piloty-jobs.ts**

  - Exécution: `npx ts-node scripts/letudiant/archive-piloty-jobs.ts [--env <nom|chemin>]`
  - Usage: Archive des offres côté Piloty à partir d’une liste d’identifiants publics (à éditer dans le script).
  - Prérequis: `LETUDIANT_PILOTY_TOKEN` (env).

- **mongo-backfill/**

  - Sous-dossier dédié à la migration des modèles MongoDB vers PostgreSQL.
  - Voir `scripts/mongo-backfill/README.md` pour les commandes complètes:
    - Email: `npx ts-node scripts/mongo-backfill/backfill-email.ts [--env <chemin>]`

- **fill-stat-event-updated-at.ts**

  - Exécution: `npx ts-node scripts/fill-stat-event-updated-at.ts [--batch <taille>]`
  - Usage: Met à jour le champ `updated_at` de la table `StatEvent` lorsqu'il est `NULL`, en le remplaçant par `created_at` (traitement par lots).
  - Options: `--batch <taille>` pour définir la taille de lot (défaut: 5000).
  - Prérequis: Nécessite l'accès à Postgres `core`.

- **fixtures/**

  - Scripts d’initialisation/d’échantillonnage de données (voir `scripts/fixtures/README.md`), dont:
    - `populate-stat-events-from-missions.ts`: génère des `StatEvent` réalistes pour un ou plusieurs publishers à partir de missions Mongo.

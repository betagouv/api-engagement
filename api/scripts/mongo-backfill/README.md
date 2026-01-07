# mongo-backfill

Outils de migration (backfill) des données depuis MongoDB vers PostgreSQL.

## Chargement des variables d'environnement

- Les scripts acceptent `--env` pour charger les variables via dotenv AVANT toute connexion DB.
- Deux formes sont supportées:
  - Nom d'environnement: `--env production` chargera `api/.env.production`.
  - Chemin de fichier: `--env api/.env.production` (chemin relatif ou absolu).
- Sans `--env`, fallback sur `api/.env` s'il existe.

Pré-requis: votre fichier `.env*` doit contenir au minimum les variables MongoDB (`DB_ENDPOINT`) et celles nécessaires à PostgreSQL (variables utilisées par Prisma).

## backfill-email.ts

- Rôle: migrer la collection Mongo `emails` vers la table correspondante dans PostgreSQL.
- Options:
  - `--dry-run` exécute sans écrire en base et affiche des exemples de créations/mises à jour.
  - `--env <nom|chemin>` sélectionne le fichier d'environnement à charger.
- Exemples:

```bash
# Dry-run avec l'environnement production (utilise api/.env.production)
npx ts-node api/scripts/mongo-backfill/backfill-email.ts --env production --dry-run

# Exécution réelle en pointant explicitement un fichier .env
npx ts-node api/scripts/mongo-backfill/backfill-email.ts --env api/.env.production
```

## backfill-publisher.ts

- Rôle: migrer la collection Mongo `publishers` (et ses diffuseurs) vers PostgreSQL.
- Options:
  - `--dry-run` exécute sans écrire en base et loggue les actions qui seraient effectuées.
  - `--env <nom|chemin>` sélectionne le fichier d'environnement à charger.
- Exemples:

```bash
# Dry-run
npx ts-node api/scripts/mongo-backfill/backfill-publisher.ts --env production --dry-run

# Exécution réelle
npx ts-node api/scripts/mongo-backfill/backfill-publisher.ts --env api/.env.production
```

## backfill-moderation-event.ts

- Exécution: `npx ts-node scripts/mongo-backfill/backfill-moderation-event.ts [--env <chemin>] [--dry-run]`
- Usage: Migration des événements de modération depuis MongoDB vers PostgreSQL (bulk insert/update).

## backfill-publisher-diffusion-exclusion.ts

- Rôle: migrer la collection Mongo `organization-exclusion` vers la table correspondante dans PostgreSQL.
- Options:
  - `--dry-run` exécute sans écrire en base et affiche des exemples de créations.
  - `--env <nom|chemin>` sélectionne le fichier d'environnement à charger.
- Exemples:

```bash
# Dry-run avec l'environnement production (utilise api/.env.production)
npx ts-node api/scripts/mongo-backfill/backfill-publisher-diffusion-exclusion.ts --env production --dry-run

# Exécution réelle en pointant explicitement un fichier .env
npx ts-node api/scripts/mongo-backfill/backfill-publisher-diffusion-exclusion.ts --env api/.env.production
```

## backfill-campaign.ts

- Rôle: migrer la collection Mongo `campaign` (et ses trackers) vers la table correspondante dans PostgreSQL.
- Options:
  - `--dry-run` exécute sans écrire en base et affiche des exemples de créations.
  - `--env <nom|chemin>` sélectionne le fichier d'environnement à charger.
- Exemples:

```bash
# Dry-run avec l'environnement production (utilise api/.env.production)
npx ts-node api/scripts/mongo-backfill/backfill-campaign.ts --env production --dry-run

# Exécution réelle en pointant explicitement un fichier .env
npx ts-node api/scripts/mongo-backfill/backfill-campaign.ts --env api/.env.production
```

## backfill-user.ts

- Rôle: migrer la collection Mongo `users` vers la table Prisma `user`.
- Options:
  - `--dry-run` affiche les créations/mises à jour sans écrire en base.
  - `--env <nom|chemin>` charge le fichier d'environnement à utiliser avant les connexions Mongo/PostgreSQL.
- Exemples:

```bash
# Dry-run avec les variables de api/.env.production
npx ts-node api/scripts/mongo-backfill/backfill-user.ts --env production --dry-run

# Exécution réelle avec un fichier .env explicite
npx ts-node api/scripts/mongo-backfill/backfill-user.ts --env api/.env.production
```

## backfill-login-history.ts

- Rôle: reconstruire la table `login_history` PostgreSQL à partir du champ `user.login_at` encore présent dans la base `core`.
- Options:
  - `--dry-run` simule les suppressions/insertions sans écrire en base et affiche quelques exemples.
  - `--env <nom|chemin>` charge le fichier d'environnement avant d'ouvrir la connexion PostgreSQL.
- Exemples:

```bash
# Simulation complète
npx ts-node api/scripts/mongo-backfill/backfill-login-history.ts --env production --dry-run

# Exécution réelle
npx ts-node api/scripts/mongo-backfill/backfill-login-history.ts --env api/.env.production
```

## backfill-mission.ts

- Rôle: migrer la collection Mongo `missions` vers PostgreSQL (missions + adresses + statuts de modération + job boards).
- Options:
  - `--dry-run` exécute sans écrire en base et affiche des exemples de créations/mises à jour.
  - `--bulk-insert` exécute les insertions en `createMany` (plus rapide) **uniquement si la table `mission` de destination est vide**.
  - `--env <nom|chemin>` sélectionne le fichier d'environnement à charger.
- Exemples:

```bash
# Exécution réelle en bulk (destination vide)
npx ts-node api/scripts/mongo-backfill/backfill-mission.ts --env production --bulk-insert
```

## backfill-mission-event.ts

- Rôle: migrer les événements de mission (`mission-events`) depuis MongoDB vers la table `mission_event` de Postgres.
- Idempotent: chaque run compare les documents Mongo existants avec les lignes Postgres (création si absentes, update si différences, sinon ignoré).
- Options:
  - `--dry-run` pour simuler sans écrire en base et afficher des exemples.
  - `--env <nom|chemin>` pour charger l'environnement adéquat.
- Exemples:

```bash
# Simulation
npx ts-node scripts/mongo-backfill/backfill-mission-event.ts --env production --dry-run

# Migration effective
npx ts-node scripts/mongo-backfill/backfill-mission-event.ts --env api/.env.production
```

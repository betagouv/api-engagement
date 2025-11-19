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

## Notes d'implémentation

- Les imports dépendants des variables d'environnement (Mongo/PG/repos) sont chargés dynamiquement dans les scripts afin que `dotenv` soit appliqué avant l'initialisation des connexions.
- En cas d'échec, vérifiez que `DB_ENDPOINT` est bien défini et que les variables PostgreSQL attendues par Prisma sont présentes.

## backfill-moderation-event.ts

- Exécution: `npx ts-node scripts/mongo-backfill/backfill-moderation-event.ts [--env <chemin>] [--dry-run]`
- Usage: Migration des événements de modération depuis MongoDB vers PostgreSQL (bulk insert/update).

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

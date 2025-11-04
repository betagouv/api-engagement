# mongo-backfill

## backfill-email.ts

- Exécution: `npx ts-node scripts/mongo-backfill/backfill-email.ts [--env <chemin>] [--dry-run]`
- Usage: Backfill des modèles MongoDB vers PostgreSQL.

## backfill-moderation-event.ts

- Exécution: `npx ts-node scripts/mongo-backfill/backfill-moderation-event.ts [--env <chemin>] [--dry-run]`
- Usage: Migration des événements de modération depuis MongoDB vers PostgreSQL (bulk insert/update).

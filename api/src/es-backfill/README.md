# es-backfill

Scripts pour migrer les événements d’analytics de l’Elasticsearch historique vers PostgreSQL (StatEvent) et vérifier la cohérence.

## Principe

- Lecture d’ES index stats par lot (scroll, 1000).
- Mapping et insertion en PG avec skipDuplicates (idempotent).
- L’ID ES est conservé dans es_id.
- Reprise via backfill-state.json (lastCreatedAt), gitignoré.

## Prérequis

- Node 18+
- `ES_ENDPOINT`, `DATABASE_URL_CORE` configurés (dotenv ou flags).
- Prisma généré: npm run prisma:generate (dans api/).

## Commandes

### Backfill simple

```bash
npx ts-node src/es-backfill/backfill.ts
```

ou

```bash
npx ts-node src/es-backfill/backfill.ts --env .env.local
```

ou, pour écraser spécifiquement les endpoints (et ainsi piocher dans ES de prod pour remplir un PG local, par exemple) :

```bash
npx ts-node src/es-backfill/backfill.ts --env .env.local --es https://es:9200 --db "postgres://user:pass@host:5432/core?schema=public"
```

### Vérification (comptes par jour/type + spot-check d’IDs):

```bash
npx ts-node src/es-backfill/check.ts
```

Les mêmes paramètres (`--env`, `--es`, `--db`) sont disponibles.

## Reprise & reset

Reprise auto depuis src/es-backfill/backfill-state.json.
Pour repartir de zéro: supprimer le fichier d’état puis relancer.

## Dépannage

Variables manquantes: vérifier ES_ENDPOINT, DATABASE_URL_CORE.
Écarts de comptage: relancer la vérification sur une fenêtre stable (pas d’écriture concurrente).

# Jobs d'export (analytics)

Ce dossier fournit un mini-framework pour synchroniser des tables PostgreSQL via des jobs Typescript.

## Exécution d’un job

```
npm run job -- export-to-pg StatEvent
```

- `export-to-pg` correspond au dossier `src/jobs/export-to-pg`.
- `StatEvent` est la clé déclarée dans `src/jobs/export-to-pg/config.ts`.

Le script `run-job.ts` charge dynamiquement le handler associé, exécute `handle(table)` et journalise le résultat (console + Slack si configuré).

## Structure d’un job

- `src/jobs/export-to-pg/config.ts` : liste des définitions d’export (`ExportDefinition`).
- `src/jobs/export-to-pg/handler.ts` : handler qui invoque `processDefinition`.
- `src/services/process-definition.ts` : lecture incrémentale source → transformation → `bulkUpsert`.

### Paramètres `source`

| Champ              | Description                                                                     |
|--------------------|---------------------------------------------------------------------------------|
| `schema` (option)  | Schéma source (défaut : `public`)                                              |
| `table`            | Nom de la table source                                                          |
| `cursorField`      | Colonne utilisée comme curseur (timestamp)                                     |
| `columns` (option) | Colonnes sélectionnées (`*` par défaut)                                        |
| `additionalWhere`  | Clause WHERE supplémentaire (sera ANDée)                                       |

### Paramètres `destination`

| Champ                 | Description                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| `schema` (option)     | Schéma destination (défaut : `analytics_raw`)                                   |
| `table`               | Table cible dans la base analytics                                               |
| `conflictColumns`     | Colonnes uniques pour `ON CONFLICT` (définissent l’upsert)                       |

### Transformation

`transform?: (row) => Record<string, any> | null` permet d’adapter chaque ligne :
- renommer/filtrer des champs
- enrichir ou normaliser les données
- retourner `null` pour ignorer un enregistrement

Exemple :

```ts
transform: (row) => {
  if (!row.source_id) {
    return null; // on skippe les lignes incomplètes
  }
  return {
    old_id: row.id,
    created_at: new Date(row.created_at),
    source: row.source === "publisher" ? "api" : row.source,
    to_partner_id: row.to_publisher_id,
    // on peut ajouter des champs dérivés
    is_widget: row.source === "widget",
  };
}
```

## Fonctions utilitaires

- `withCoreClient` (`src/db/pg-core.ts`) : accès PG source (pool).
- `withAnalyticsClient` (`src/db/pg-analytics.ts`) : accès PG destination.
- `buildSelectQuery` / `bulkUpsert` (`src/services/sql.ts`) : requêtes SQL génériques.
- `getExportState` / `updateExportState` (`src/services/state.ts`) : gestion du curseur incrémental (`pg_export_state`).

## Dépendances requises

- Variables d’environnement : `DATABASE_URL_CORE`, `DATABASE_URL_ANALYTICS`.
- Packages : `pg`, `ts-node`, `dbmate`.

## Workflow type

1. Créer/mettre à jour le schéma destination via `dbmate`.
2. Ajouter la définition d’export dans `config.ts`.
3. Exécuter `npm run job -- export-to-pg <Table>` pour peupler la table analytics.

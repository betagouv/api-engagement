import { withAnalyticsClient } from "../db/pg-analytics";
import { withCoreClient } from "../db/pg-core";
import { ExportDefinition, ExportSummary } from "../jobs/types";
import { getExportState, updateExportState } from "../services/state";
import formatTimestamp from "../utils/format-timestamp";
import { captureException } from "./error";
import { buildSelectQuery, bulkUpsert } from "./sql";

const DEFAULT_BATCH_SIZE = 1000;

/**
 * Lecteur de source paginé par curseur.
 * Renvoie un lot d'enregistrements bruts strictement supérieur à (cursorValue, cursorId),
 * trié de façon croissante et limité à `batchSize`.
 */
export type SourceReader = (cursorValue: string | null, cursorId: string | null, batchSize: number) => Promise<Record<string, any>[]>;

export interface IncrementalSyncParams {
  key: string;
  batchSize: number;
  cursorField: string;
  cursorIdField?: string | null;
  transform?: (row: Record<string, any>) => Record<string, any> | null;
  destination: {
    table: string;
    schema?: string;
    conflictColumns: string[];
  };
  fetchBatch: SourceReader;
}

/**
 * Boucle d'export incrémental générique (curseur + batch + upsert idempotent + état).
 * Indépendante de la source : la lecture est fournie via `fetchBatch`.
 */
export const runIncrementalSync = async (params: IncrementalSyncParams): Promise<ExportSummary> => {
  const start = Date.now();
  const { key, batchSize, destination } = params;
  const transform = params.transform ?? ((row: Record<string, any>) => row);
  const cursorField = params.cursorField;
  const cursorIdField = params.cursorIdField ?? null;

  console.log(`[Export] Début '${key}' (batch=${batchSize})`);

  const summary: ExportSummary = {
    processed: 0,
    written: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const state = await getExportState(key);
  let cursorValue = formatTimestamp(state?.cursorValue ?? null);
  let cursorId = cursorIdField ? (state?.cursorId ?? null) : null;

  const fetchBatch = async (value: string | null, id: string | null) => {
    try {
      return await params.fetchBatch(value, cursorIdField ? id : null, batchSize);
    } catch (error) {
      summary.errors += 1;
      captureException(error, { extra: { definition: key, cursorValue: value, cursorId: id } });
      throw error;
    }
  };

  let batchIndex = 0;
  let batch = await fetchBatch(cursorValue, cursorId);
  console.log(`[Export] '${key}' -> premier lot: ${batch.length} lignes (cursor=${cursorValue ?? "null"}, cursorId=${cursorId ?? "null"})`);

  while (batch.length > 0) {
    batchIndex += 1;
    console.log(`[Export] '${key}' -> traitement lot #${batchIndex} (taille=${batch.length})`);

    const insertStart = Date.now();
    let lastCursorValueInBatch: string | null = null;
    let lastCursorIdInBatch: string | null = null;
    const entries: { data: Record<string, any>; cursorValue: string; cursorId: string | null }[] = [];

    for (const record of batch) {
      summary.processed += 1;

      const rawCursorValue = record[cursorField];
      if (rawCursorValue === undefined || rawCursorValue === null) {
        summary.errors += 1;
        captureException(new Error("Invalid cursor value for export"), {
          extra: { definition: key, record },
        });
        throw new Error("Invalid cursor value for export");
      }

      const currentCursorValue = formatTimestamp(rawCursorValue);
      if (!currentCursorValue) {
        summary.errors += 1;
        captureException(new Error("Unable to convert cursor value for export"), {
          extra: { definition: key, record, cursorValueType: typeof rawCursorValue },
        });
        throw new Error("Unable to convert cursor value for export");
      }

      lastCursorValueInBatch = currentCursorValue;
      let currentCursorId: string | null = null;
      if (cursorIdField) {
        const rawCursorId = record[cursorIdField];
        if (rawCursorId === undefined || rawCursorId === null) {
          summary.errors += 1;
          captureException(new Error("Invalid cursor identifier for export"), {
            extra: { definition: key, record },
          });
          throw new Error("Invalid cursor identifier for export");
        }
        currentCursorId = String(rawCursorId);
        lastCursorIdInBatch = currentCursorId;
      }

      try {
        const transformed = transform(record);
        if (!transformed) {
          summary.skipped += 1;
          continue;
        }
        entries.push({ data: transformed, cursorValue: currentCursorValue, cursorId: currentCursorId });
      } catch (error) {
        summary.errors += 1;
        captureException(error, { extra: { definition: key, record } });
        throw error;
      }
    }

    if (entries.length === 0) {
      if (lastCursorValueInBatch) {
        const nextCursor = lastCursorValueInBatch;
        const nextCursorId = lastCursorIdInBatch;
        cursorValue = nextCursor;
        cursorId = nextCursorId;
        await updateExportState(key, nextCursor, nextCursorId ?? undefined);
        batch = await fetchBatch(nextCursor, nextCursorId);
        continue;
      }
      throw new Error(`[Export PG] No record found for ${key} during this batch.`);
    }

    const payload = entries.map((entry) => entry.data);

    try {
      await withAnalyticsClient((client) =>
        bulkUpsert(client, payload, {
          table: destination.table,
          schema: destination.schema ?? "analytics_raw",
          conflictColumns: destination.conflictColumns,
        })
      );
      const insertDuration = Date.now() - insertStart;
      summary.written += payload.length;

      const lastEntry = entries[entries.length - 1];
      const nextCursor = lastEntry.cursorValue;
      const nextCursorId = lastEntry.cursorId;
      cursorValue = nextCursor;
      cursorId = nextCursorId;

      await updateExportState(key, nextCursor, nextCursorId ?? undefined);

      console.log(`[Export] '${key}' -> upsert ${payload.length} lignes (cursor=${nextCursor}, cursorId=${nextCursorId ?? "null"}) in ${insertDuration}ms`);
    } catch (error) {
      summary.errors += payload.length;
      captureException(error, { extra: { definition: key, batchSize: payload.length } });
      throw error;
    }

    batch = await fetchBatch(cursorValue, cursorId);
  }

  summary.durationMs = Date.now() - start;
  return summary;
};

/**
 * Export incrémental depuis la base core (Postgres) vers la base analytics.
 * Construit un lecteur SQL paginé et délègue la boucle à `runIncrementalSync`.
 */
export const processDefinition = async (definition: ExportDefinition, batchSizeOverride?: number): Promise<ExportSummary> => {
  const envBatchSize = process.env.BATCH_SIZE;
  const batchSize = batchSizeOverride ?? envBatchSize ?? definition.batchSize ?? DEFAULT_BATCH_SIZE;

  const cursorIdField = definition.source.cursor.idField ?? null;

  const selectQuery = buildSelectQuery({
    table: definition.source.table,
    schema: definition.source.schema ?? "public",
    cursorField: definition.source.cursor.field,
    cursorIdField: cursorIdField ?? undefined,
    columns: definition.source.columns,
  });

  const fetchBatch: SourceReader = async (value, id, size) => {
    const params = cursorIdField ? [value, id ?? "", size] : [value, size];
    const { rows } = await withCoreClient((client) => client.query(selectQuery, params));
    return rows;
  };

  return runIncrementalSync({
    key: definition.key,
    batchSize: Number(batchSize),
    cursorField: definition.source.cursor.field,
    cursorIdField,
    transform: definition.transform,
    destination: definition.destination,
    fetchBatch,
  });
};

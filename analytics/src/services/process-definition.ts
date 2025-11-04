import { withAnalyticsClient } from "../db/pg-analytics";
import { withCoreClient } from "../db/pg-core";
import { ExportDefinition, ExportSummary } from "../jobs/types";
import { getExportState, updateExportState } from "../services/state";
import formatTimestamp from "../utils/format-timestamp";
import { captureException } from "./error";
import { buildSelectQuery, bulkUpsert } from "./sql";

const DEFAULT_BATCH_SIZE = 1000;

export const processDefinition = async (definition: ExportDefinition, batchSizeOverride?: number): Promise<ExportSummary> => {
  const start = Date.now();
  const envBatchSize = process.env.BATCH_SIZE;
  const batchSize = batchSizeOverride ?? envBatchSize ?? definition.batchSize ?? DEFAULT_BATCH_SIZE;
  console.log(`[Export] Début '${definition.key}' (batch=${batchSize})`);

  const summary: ExportSummary = {
    processed: 0,
    written: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const state = await getExportState(definition.key);
  const transform = definition.transform ?? ((row: Record<string, any>) => row);
  const cursorField = definition.source.cursor.field;
  const cursorIdField = definition.source.cursor.idField ?? null;

  let cursorValue = formatTimestamp(state?.cursorValue ?? null);
  let cursorId = cursorIdField ? (state?.cursorId ?? null) : null;

  const selectQuery = buildSelectQuery({
    table: definition.source.table,
    schema: definition.source.schema ?? "public",
    cursorField,
    cursorIdField: cursorIdField ?? undefined,
    columns: definition.source.columns,
  });

  const fetchBatch = async (value: string | null, id: string | null) => {
    try {
      const params = cursorIdField ? [value, id ?? "", batchSize] : [value, batchSize];
      const { rows } = await withCoreClient((client) => client.query(selectQuery, params));

      return rows;
    } catch (error) {
      summary.errors += 1;
      captureException(error, { extra: { definition: definition.key, cursorValue: value, cursorId: id } });
      throw error;
    }
  };

  let batchIndex = 0;
  let batch = await fetchBatch(cursorValue, cursorId);
  console.log(`[Export] '${definition.key}' -> premier lot: ${batch.length} lignes (cursor=${cursorValue ?? "null"}, cursorId=${cursorId ?? "null"})`);

  while (batch.length > 0) {
    batchIndex += 1;
    console.log(`[Export] '${definition.key}' -> traitement lot #${batchIndex} (taille=${batch.length})`);

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
          extra: { definition: definition.key, record },
        });
        throw new Error("Invalid cursor value for export");
      }

      const currentCursorValue = formatTimestamp(rawCursorValue);
      if (!currentCursorValue) {
        summary.errors += 1;
        captureException(new Error("Unable to convert cursor value for export"), {
          extra: { definition: definition.key, record, cursorValueType: typeof rawCursorValue },
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
            extra: { definition: definition.key, record },
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
        captureException(error, { extra: { definition: definition.key, record } });
        throw error;
      }
    }

    if (entries.length === 0) {
      if (lastCursorValueInBatch) {
        const nextCursor = lastCursorValueInBatch;
        const nextCursorId = lastCursorIdInBatch;
        cursorValue = nextCursor;
        cursorId = nextCursorId;
        await updateExportState(definition.key, nextCursor, nextCursorId ?? undefined);
        batch = await fetchBatch(nextCursor, nextCursorId);
        continue;
      }
      throw new Error(`[Export PG] No record found for ${definition.key} during this batch.`);
    }

    const payload = entries.map((entry) => entry.data);

    try {
      await withAnalyticsClient((client) =>
        bulkUpsert(client, payload, {
          table: definition.destination.table,
          schema: definition.destination.schema ?? "analytics_raw",
          conflictColumns: definition.destination.conflictColumns,
        })
      );
      const insertDuration = Date.now() - insertStart;
      summary.written += payload.length;

      const lastEntry = entries[entries.length - 1];
      const nextCursor = lastEntry.cursorValue;
      const nextCursorId = lastEntry.cursorId;
      cursorValue = nextCursor;
      cursorId = nextCursorId;

      await updateExportState(definition.key, nextCursor, nextCursorId ?? undefined);

      console.log(`[Export] '${definition.key}' -> upsert ${payload.length} lignes (cursor=${nextCursor}, cursorId=${nextCursorId ?? "null"}) in ${insertDuration}ms`);
    } catch (error) {
      summary.errors += payload.length;
      captureException(error, { extra: { definition: definition.key, batchSize: payload.length } });
      throw error;
    }

    batch = await fetchBatch(cursorValue, cursorId);
  }

  summary.durationMs = Date.now() - start;
  return summary;
};

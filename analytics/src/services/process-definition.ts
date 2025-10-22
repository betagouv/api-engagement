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
  const batchSize = batchSizeOverride ?? definition.batchSize ?? DEFAULT_BATCH_SIZE;
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
  const cursorField = definition.source.cursorField;

  let cursorValue = formatTimestamp(state?.cursorValue ?? null);

  const selectQuery = buildSelectQuery({
    table: definition.source.table,
    schema: definition.source.schema ?? "public",
    cursorField,
    columns: definition.source.columns,
  });

  const fetchBatch = async (value: string | null) => {
    try {
      const { rows } = await withCoreClient((client) => client.query(selectQuery, [value, batchSize]));

      return rows;
    } catch (error) {
      summary.errors += 1;
      captureException(error, { extra: { definition: definition.key, cursorValue: value } });
      throw error;
    }
  };

  let batchIndex = 0;
  let batch = await fetchBatch(cursorValue);
  console.log(`[Export] '${definition.key}' -> premier lot: ${batch.length} lignes (cursor=${cursorValue ?? "null"})`);

  while (batch.length > 0) {
    batchIndex += 1;
    console.log(`[Export] '${definition.key}' -> traitement lot #${batchIndex} (taille=${batch.length})`);

    let lastCursorValueInBatch: string | null = null;
    const entries: { data: Record<string, any>; cursorValue: string }[] = [];

    for (const record of batch) {
      summary.processed += 1;

      const rawCursorValue = record[cursorField];
      if (rawCursorValue === undefined || rawCursorValue === null) {
        summary.errors += 1;
        captureException(new Error("Invalid cursor value for export"), {
          extra: { definition: definition.key, record },
        });

        continue;
      }

      const currentCursorValue = formatTimestamp(rawCursorValue);
      if (!currentCursorValue) {
        summary.errors += 1;
        captureException(new Error("Unable to convert cursor value for export"), {
          extra: { definition: definition.key, record, cursorValueType: typeof rawCursorValue },
        });

        continue;
      }

      lastCursorValueInBatch = currentCursorValue;

      try {
        const transformed = transform(record);
        if (!transformed) {
          summary.skipped += 1;
          continue;
        }
        entries.push({ data: transformed, cursorValue: currentCursorValue });
      } catch (error) {
        summary.errors += 1;
        captureException(error, { extra: { definition: definition.key, record } });
      }
    }

    if (entries.length === 0) {
      if (lastCursorValueInBatch) {
        const nextCursor = lastCursorValueInBatch;
        cursorValue = nextCursor;

        await updateExportState(definition.key, nextCursor);

        batch = await fetchBatch(nextCursor);
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
      summary.written += payload.length;

      const lastEntry = entries[entries.length - 1];
      const nextCursor = lastEntry.cursorValue;
      cursorValue = nextCursor;

      await updateExportState(definition.key, nextCursor);

      console.log(`[Export] '${definition.key}' -> upsert ${payload.length} lignes (cursor=${nextCursor})`);
    } catch (error) {
      summary.errors += payload.length;
      captureException(error, { extra: { definition: definition.key, batchSize: payload.length } });

      throw error;
    }

    batch = await fetchBatch(cursorValue);
  }

  summary.durationMs = Date.now() - start;
  return summary;
};

import { runIncrementalSync } from "../../services/process-definition";
import { createTrackingEventReader } from "../../services/tracking";
import { BaseHandler } from "../base/handler";
import { ExportSummary, JobResult } from "../types";
import { TrackingExportDefinition, trackingExportDefinitions } from "./config";

const DEFAULT_BATCH_SIZE = 1000;

interface ExportTrackingJobPayload {
  table?: string;
  batchSize?: number;
}

type ExportTrackingTableResult = JobResult & {
  table: string;
  summary: ExportSummary;
};

type ExportTrackingJobResult = JobResult & {
  summary: ExportSummary;
  tables: ExportTrackingTableResult[];
};

const buildEmptySummary = (): ExportSummary => ({
  processed: 0,
  written: 0,
  skipped: 0,
  errors: 0,
  durationMs: 0,
});

const formatSummaryStats = (summary: ExportSummary, definitionKey: string) =>
  [
    `• Table: ${definitionKey}`,
    `• Lignes traitées: ${summary.processed}`,
    `• Lignes écrites: ${summary.written}`,
    `• Lignes ignorées: ${summary.skipped}`,
    `• Erreurs: ${summary.errors}`,
    `• Durée: ${summary.durationMs}ms`,
  ].join("\n");

const buildSummaryMessage = (definitionKey: string, summary: ExportSummary) => {
  const stats = formatSummaryStats(summary, definitionKey);
  if (summary.errors > 0) {
    return [`Export ${definitionKey} KO: ${summary.errorMessage ?? "see logs for more details"}`, stats].join("\n");
  }
  return [`Export ${definitionKey} OK`, stats].join("\n");
};

const resolveBatchSize = (definition: TrackingExportDefinition, override?: number): number => {
  const envBatchSize = process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : undefined;
  const candidate = override ?? envBatchSize ?? definition.batchSize ?? DEFAULT_BATCH_SIZE;
  return Number.isFinite(candidate) && candidate > 0 ? Math.floor(candidate) : DEFAULT_BATCH_SIZE;
};

const processDefinition = async (definition: TrackingExportDefinition, batchSizeOverride?: number): Promise<ExportTrackingTableResult> => {
  console.log(`[Export Tracking] Starting ${definition.key}`);

  const startTime = Date.now();
  try {
    const summary = await runIncrementalSync({
      key: definition.key,
      batchSize: resolveBatchSize(definition, batchSizeOverride),
      cursorField: definition.cursor.field,
      cursorIdField: definition.cursor.idField ?? null,
      transform: definition.transform,
      destination: definition.destination,
      fetchBatch: createTrackingEventReader(),
    });

    console.log(`[Export Tracking] Finished ${definition.key}`);
    const success = summary.errors === 0;
    return {
      table: definition.key,
      success,
      timestamp: new Date(),
      summary,
      message: buildSummaryMessage(definition.key, summary),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const summary: ExportSummary = {
      ...buildEmptySummary(),
      errors: 1,
      durationMs: Date.now() - startTime,
      errorMessage,
    };
    return {
      table: definition.key,
      success: false,
      timestamp: new Date(),
      summary,
      message: buildSummaryMessage(definition.key, summary),
    };
  }
};

export class ExportTrackingRawHandler implements BaseHandler<ExportTrackingJobPayload, ExportTrackingJobResult> {
  name = "Tracking events export";

  public async handle(payload: ExportTrackingJobPayload): Promise<ExportTrackingJobResult> {
    const requestedTables = payload?.table ? [payload.table] : trackingExportDefinitions.map((item) => item.key);
    const tables = Array.from(new Set(requestedTables));

    const results: ExportTrackingTableResult[] = [];
    for (const table of tables) {
      const definition = trackingExportDefinitions.find((item) => item.key === table);
      if (!definition) {
        results.push({
          table,
          success: false,
          timestamp: new Date(),
          summary: buildEmptySummary(),
          message: `Definition tracking '${table}' introuvable`,
        });
        continue;
      }
      results.push(await processDefinition(definition, payload?.batchSize));
    }

    const summary = results.reduce(
      (acc, result) => ({
        processed: acc.processed + result.summary.processed,
        written: acc.written + result.summary.written,
        skipped: acc.skipped + result.summary.skipped,
        errors: acc.errors + result.summary.errors,
        durationMs: acc.durationMs + result.summary.durationMs,
      }),
      buildEmptySummary()
    );

    const success = results.every((result) => result.success);
    const message =
      results.length === 1
        ? (results[0].message ?? buildSummaryMessage(results[0].table, results[0].summary))
        : [`Export tracking global ${success ? "OK" : "KO"}`, ...results.map((result) => buildSummaryMessage(result.table, result.summary))].join("\n");

    return {
      success,
      timestamp: new Date(),
      summary,
      tables: results,
      message,
    };
  }
}

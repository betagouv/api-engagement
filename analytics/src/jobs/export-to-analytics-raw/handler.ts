import { BaseHandler } from "../base/handler";
import { ExportSummary, JobResult } from "../types";
import { exportDefinitions } from "./config";

import { processDefinition } from "../../services/process-definition";

interface ExportToPgJobPayload {
  table?: string;
  batchSize?: number;
}

type ExportToPgTableResult = JobResult & {
  table: string;
  summary: ExportSummary;
};

type ExportToPgJobResult = JobResult & {
  summary: ExportSummary;
  tables: ExportToPgTableResult[];
};

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

const buildEmptySummary = (): ExportSummary => ({
  processed: 0,
  written: 0,
  skipped: 0,
  errors: 0,
  durationMs: 0,
});

const processTable = async (table: string, batchSizeOverride?: number): Promise<ExportToPgTableResult> => {
  const definition = exportDefinitions.find((item) => item.key === table);
  if (!definition) {
    return {
      table,
      success: false,
      timestamp: new Date(),
      summary: buildEmptySummary(),
      message: `Table '${table}' definition not found`,
    };
  }

  console.log(`[Export PG] Starting ${definition.key}`);

  let summary: ExportSummary | null = null;
  const startTime = Date.now();
  let lastErrorMessage: string | undefined;
  try {
    summary = await processDefinition(definition, batchSizeOverride);
    console.log(`[Export PG] Finished ${definition.key}`);
  } catch (error) {
    lastErrorMessage = error instanceof Error ? error.message : String(error);
    summary = {
      processed: 0,
      written: 0,
      skipped: 0,
      errors: 1,
      durationMs: Date.now() - startTime,
      errorMessage: lastErrorMessage,
    };

    const message = buildSummaryMessage(definition.key, summary);
    return {
      table: definition.key,
      success: false,
      timestamp: new Date(),
      summary,
      message,
    };
  }

  if (!summary) {
    summary = buildEmptySummary();
  }

  const finalSummary: ExportSummary = {
    ...summary,
    durationMs: summary.durationMs && summary.durationMs > 0 ? summary.durationMs : Date.now() - startTime,
    errorMessage: summary.errorMessage ?? (summary.errors > 0 ? lastErrorMessage : undefined),
  };

  const success = finalSummary.errors === 0;
  const message = buildSummaryMessage(definition.key, finalSummary);

  return {
    table: definition.key,
    success,
    timestamp: new Date(),
    summary: finalSummary,
    message,
  };
};

export class ExportToAnalyticsRawHandler implements BaseHandler<ExportToPgJobPayload, ExportToPgJobResult> {
  name = "Generic PostgreSQL export";

  public async handle(payload: ExportToPgJobPayload): Promise<ExportToPgJobResult> {
    const requestedTables = payload?.table ? [payload.table] : exportDefinitions.map((item) => item.key);
    const tables = Array.from(new Set(requestedTables));

    const results: ExportToPgTableResult[] = [];
    for (const table of tables) {
      const result = await processTable(table, payload?.batchSize);
      results.push(result);
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
    const successfulTables = results.filter((result) => result.success).length;
    const failedTables = results.length - successfulTables;

    const message =
      results.length === 1
        ? results[0].message ?? buildSummaryMessage(results[0].table, results[0].summary)
        : [
            `Export global ${success ? "OK" : "KO"}`,
            `• Tables traitées: ${results.length}`,
            `• Tables OK: ${successfulTables}`,
            `• Tables KO: ${failedTables}`,
            `• Lignes traitées: ${summary.processed}`,
            `• Lignes écrites: ${summary.written}`,
            `• Lignes ignorées: ${summary.skipped}`,
            `• Erreurs: ${summary.errors}`,
            `• Durée cumulée: ${summary.durationMs}ms`,
            "",
            "Détail par table:",
            ...results.map((result) => buildSummaryMessage(result.table, result.summary)),
          ].join("\n");

    return {
      success,
      timestamp: new Date(),
      summary,
      tables: results,
      message,
    };
  }
}

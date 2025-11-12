import { BaseHandler } from "../base/handler";
import { ExportSummary, JobResult } from "../types";
import { exportDefinitions } from "./config";

import { processDefinition } from "../../services/process-definition";

interface ExportToPgJobPayload {
  table: string;
  batchSize?: number;
}

type ExportToPgJobResult = JobResult & {
  summary: ExportSummary;
};

const formatSummaryStats = (summary: ExportSummary, definitionKey: string) =>
  `\n\t• Lignes traitées: ${summary.processed} \n\t• Nombre de ${definitionKey} créées: ${summary.written} \n\t• Nombre de ${definitionKey} ignorés: ${summary.skipped} \n\t• Nombre de ${definitionKey} en erreur: ${summary.errors}`;

const buildSummaryMessage = (definitionKey: string, summary: ExportSummary) => {
  const stats = formatSummaryStats(summary, definitionKey);
  if (summary.errors > 0) {
    return `Export ${definitionKey} KO: ${summary.errorMessage ?? "see logs for more details"}. ${stats}`;
  }
  return `Export ${definitionKey} OK. ${stats}`;
};

export class ExportToAnalyticsRawHandler implements BaseHandler<ExportToPgJobPayload, ExportToPgJobResult> {
  name = "Generic PostgreSQL export";

  public async handle(payload: ExportToPgJobPayload): Promise<ExportToPgJobResult> {
    const table = payload?.table;

    if (!table) {
      return {
        success: false,
        timestamp: new Date(),
        summary: {
          processed: 0,
          written: 0,
          skipped: 0,
          errors: 0,
          durationMs: 0,
        },
        message: "No table specified",
      };
    }

    const definition = exportDefinitions.find((item) => item.key === table);
    if (!definition) {
      return {
        success: false,
        timestamp: new Date(),
        summary: {
          processed: 0,
          written: 0,
          skipped: 0,
          errors: 0,
          durationMs: 0,
        },
        message: `Table '${table}' definition not found`,
      };
    }

    console.log(`[Export PG] Starting ${definition.key}`);

    let summary: ExportSummary | null = null;
    const startTime = Date.now();
    let lastErrorMessage: string | undefined;
    try {
      summary = await processDefinition(definition, payload?.batchSize);
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

      throw message;
    }

    if (!summary) {
      summary = {
        processed: 0,
        written: 0,
        skipped: 0,
        errors: 0,
        durationMs: 0,
      };
    }

    const finalSummary: ExportSummary = {
      ...summary,
      durationMs: summary.durationMs && summary.durationMs > 0 ? summary.durationMs : Date.now() - startTime,
      errorMessage: summary.errorMessage ?? (summary.errors > 0 ? lastErrorMessage : undefined),
    };

    const success = finalSummary.errors === 0;
    const message = buildSummaryMessage(definition.key, finalSummary);

    return {
      success,
      timestamp: new Date(),
      summary: finalSummary,
      message,
    };
  }
}

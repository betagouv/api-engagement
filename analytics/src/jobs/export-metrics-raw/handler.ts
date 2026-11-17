import { captureException } from "../../services/error";
import { createCockpitMetricsReader, getCockpitMetricsConfig } from "../../services/metrics/cockpit";
import { getMetricsCursor, writeMetricsDay } from "../../services/metrics/store";
import { METRICS_TABLE, syncDailyMetrics } from "../../services/metrics/sync";
import { BaseHandler } from "../base/handler";
import { ExportSummary, JobResult } from "../types";

interface ExportMetricsJobPayload {
  table?: string;
  environment?: string;
  batchSize?: number;
}

type ExportMetricsJobResult = JobResult & { summary: ExportSummary };

export class ExportMetricsRawHandler implements BaseHandler<ExportMetricsJobPayload, ExportMetricsJobResult> {
  name = "Export des usages API partenaires";

  public async handle(payload: ExportMetricsJobPayload = {}): Promise<ExportMetricsJobResult> {
    const start = Date.now();
    const summary: ExportSummary = { processed: 0, written: 0, skipped: 0, errors: 0, durationMs: 0 };
    try {
      if (payload.table && payload.table !== METRICS_TABLE) {
        throw new Error(`La seule table disponible pour cet export est ${METRICS_TABLE}.`);
      }
      const config = getCockpitMetricsConfig(payload.environment);
      console.log(`[Export Metrics] Début de la synchronisation (${config.environment}).`);
      await syncDailyMetrics({
        readDay: createCockpitMetricsReader(config),
        getCursor: getMetricsCursor,
        writeDay: writeMetricsDay,
        batchSize: payload.batchSize ?? (process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : undefined),
        summary,
      });
    } catch (error) {
      summary.errors += 1;
      summary.errorMessage = error instanceof Error ? error.message : String(error);
      captureException(error, { extra: { jobName: "export-metrics-raw", table: METRICS_TABLE } });
    }
    summary.durationMs = Date.now() - start;
    const success = summary.errors === 0;
    return {
      success,
      timestamp: new Date(),
      summary,
      message: [
        `Export ${METRICS_TABLE} ${success ? "OK" : "KO"}`,
        `• Lignes traitées : ${summary.processed}`,
        `• Lignes écrites : ${summary.written}`,
        `• Erreurs : ${summary.errors}`,
        `• Durée : ${summary.durationMs}ms`,
        ...(summary.errorMessage ? [`• Erreur : ${summary.errorMessage}`] : []),
      ].join("\n"),
    };
  }
}

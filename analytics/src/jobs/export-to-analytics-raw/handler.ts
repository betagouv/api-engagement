import { BaseHandler } from "../base/handler";
import { ExportSummary, JobResult } from "../types";
import { exportDefinitions } from "./config";

import { captureException } from "../../services/error";
import { processDefinition } from "../../services/process-definition";

interface ExportToPgJobPayload {
  table: string;
  batchSize?: number;
}

type ExportToPgJobResult = JobResult & {
  summary: ExportSummary;
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
    try {
      summary = await processDefinition(definition, payload?.batchSize);
      console.log(`[Export PG] Finished ${definition.key}`);
    } catch (error) {
      captureException(error, { extra: { definition: definition.key } });
      summary = {
        processed: 0,
        written: 0,
        skipped: 0,
        errors: 1,
        durationMs: 0,
      };
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

    const success = summary.errors === 0;

    return {
      success,
      timestamp: new Date(),
      summary,
      message: JSON.stringify(summary),
    };
  }
}

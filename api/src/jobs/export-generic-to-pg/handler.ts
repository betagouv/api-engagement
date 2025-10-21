import { withAnalyticsClient } from "../../db/pg-analytics";
import { prismaCore } from "../../db/postgres";
import { captureException } from "../../error";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { ExportDefinition, exportDefinitions } from "./config";
import { bulkUpsert } from "./sql-writer";
import { getExportState, updateExportState } from "./state";

const DEFAULT_BATCH_SIZE = 500;

interface ExportSummary {
  processed: number;
  written: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

interface ExportGenericToPgJobPayload {
  table?: string;
  batchSize?: number;
}

type ExportGenericToPgJobResult = JobResult & {
  summary: ExportSummary;
};

const toDate = (value: any): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildWhereClause = (cursorField: string, cursorValue: Date | null) => {
  if (!cursorValue) {
    return undefined;
  }
  return { [cursorField]: { gt: cursorValue } };
};

const processDefinition = async (definition: ExportDefinition, batchSizeOverride?: number): Promise<ExportSummary> => {
  const start = Date.now();
  const summary: ExportSummary = {
    processed: 0,
    written: 0,
    skipped: 0,
    errors: 0,
    durationMs: 0,
  };

  const batchSize = batchSizeOverride ?? definition.batchSize ?? DEFAULT_BATCH_SIZE;
  const state = await getExportState(definition.key);
  const transform = definition.transform ?? ((row: Record<string, any>) => row);

  let cursorValue = state?.cursorValue ?? null;

  const prisma = prismaCore;
  const delegate = (prisma as any)[definition.source.model];

  if (!delegate) {
    throw new Error(`Prisma delegate for '${definition.source.model}' not found.`);
  }

  const fetchBatch = async (cursor: Date | null) => {
    const whereClause = buildWhereClause(definition.source.cursorField, cursor);
    const queryOptions: Record<string, unknown> = {
      orderBy: { [definition.source.cursorField]: "asc" },
      take: batchSize,
    };

    if (whereClause) {
      queryOptions.where = whereClause;
    }

    if (definition.source.select) {
      queryOptions.select = definition.source.select;
    }

    try {
      return await delegate.findMany(queryOptions);
    } catch (error) {
      summary.errors += 1;
      captureException(error, { extra: { definition: definition.key, cursorValue: cursor } });
      throw error;
    }
  };

  let batch = await fetchBatch(cursorValue);

  while (batch.length > 0) {
    let lastCursorInBatch: Date | null = null;
    const entries: { data: Record<string, any>; cursorValue: Date }[] = [];

    for (const record of batch) {
      summary.processed += 1;

      const currentCursor = toDate(record[definition.source.cursorField]);
      if (!currentCursor) {
        summary.errors += 1;
        captureException(new Error("Invalid cursor value for export"), {
          extra: { definition: definition.key, record },
        });
        continue;
      }

      lastCursorInBatch = currentCursor;

      try {
        const transformed = transform(record);
        if (!transformed) {
          summary.skipped += 1;
          continue;
        }
        entries.push({ data: transformed, cursorValue: currentCursor });
      } catch (error) {
        summary.errors += 1;
        captureException(error, { extra: { definition: definition.key, record } });
      }
    }

    if (entries.length === 0) {
      if (lastCursorInBatch) {
        cursorValue = lastCursorInBatch;
        await updateExportState(definition.key, cursorValue, null);
        batch = await fetchBatch(cursorValue);
        continue;
      }
      throw new Error(`[Export PG] No record found for ${definition.key} during this batch.`);
    }

    const payload = entries.map((entry) => entry.data);

    try {
      await withAnalyticsClient((client) =>
        bulkUpsert(client, payload, {
          table: definition.destination.table,
          conflictColumns: definition.destination.conflictColumns,
        })
      );
      summary.written += payload.length;

      const lastEntry = entries[entries.length - 1];
      cursorValue = lastEntry.cursorValue;
      await updateExportState(definition.key, cursorValue, null);
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

export class ExportGenericToPgHandler implements BaseHandler<ExportGenericToPgJobPayload, ExportGenericToPgJobResult> {
  name = "Generic PostgreSQL export";

  public async handle(payload: ExportGenericToPgJobPayload): Promise<ExportGenericToPgJobResult> {
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

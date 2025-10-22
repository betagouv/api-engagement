/**
 * Base Job Result
 * Inherit from this interface to create specific job results
 */
export interface JobResult {
  success: boolean;
  timestamp: Date;
  message?: string;
}

export interface ExportSummary {
  processed: number;
  written: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

interface PgSourceCursorConfig {
  field: string;
  idField?: string;
}

interface PgSourceConfig {
  schema?: string;
  table: string;
  cursor: PgSourceCursorConfig;
  columns?: string[];
}

interface PgDestinationConfig {
  table: string;
  schema?: string;
  conflictColumns: string[];
}

export interface ExportDefinition<SourceRow = Record<string, any>> {
  key: string;
  batchSize?: number;
  source: PgSourceConfig;
  transform?: (row: SourceRow) => Record<string, any> | null;
  destination: PgDestinationConfig;
}

interface PrismaSourceConfig {
  model: string;
  cursorField: string;
  select?: string[];
}

interface PgDestinationConfig {
  table: string;
  conflictColumns: string[];
}

export interface ExportDefinition<SourceRow = Record<string, any>> {
  key: string;
  batchSize?: number;
  source: PrismaSourceConfig;
  transform?: (row: SourceRow) => Record<string, any> | null;
  destination: PgDestinationConfig;
}

export const exportDefinitions: ExportDefinition[] = [
  {
    key: "StatEvent",
    batchSize: 1000,
    source: {
      model: "StatEvent",
      cursorField: "created_at",
    },
    destination: {
      table: "StatEvent",
      conflictColumns: ["id"],
    },
  },
];

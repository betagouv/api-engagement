import { PoolClient } from "pg";

import { withAnalyticsClient } from "../../db/pg-analytics";

interface ExportStateRecord {
  cursorValue: Date | null;
  cursorId: string | null;
}

let stateTableEnsured = false;

const ensureTableSql = `
  CREATE TABLE IF NOT EXISTS pg_export_state (
    key TEXT PRIMARY KEY,
    cursor_value TIMESTAMPTZ,
    cursor_id TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const ensureStateTable = async (client: PoolClient) => {
  if (stateTableEnsured) {
    return;
  }
  await client.query(ensureTableSql);
  stateTableEnsured = true;
};

const mapRowToState = (row: { cursor_value: Date | null; cursor_id: string | null }): ExportStateRecord => {
  return {
    cursorValue: row?.cursor_value ? new Date(row.cursor_value) : null,
    cursorId: row?.cursor_id ?? null,
  };
};

export const getExportState = async (key: string): Promise<ExportStateRecord | null> => {
  return withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    const result = await client.query("SELECT cursor_value, cursor_id FROM pg_export_state WHERE key = $1", [key]);
    if (!result.rowCount) {
      return null;
    }
    return mapRowToState(result.rows[0]);
  });
};

export const updateExportState = async (key: string, cursorValue: Date, cursorId: string | null) => {
  await withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    await client.query(
      `
        INSERT INTO pg_export_state (key, cursor_value, cursor_id, synced_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key)
        DO UPDATE SET cursor_value = EXCLUDED.cursor_value, cursor_id = EXCLUDED.cursor_id, synced_at = NOW()
      `,
      [key, cursorValue, cursorId]
    );
  });
};

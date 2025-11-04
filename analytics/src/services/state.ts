import { PoolClient } from "pg";

import { withAnalyticsClient } from "../db/pg-analytics";
import formatTimestamp from "../utils/format-timestamp";

interface ExportStateRecord {
  cursorValue: string | null;
  cursorId: string | null;
}

let stateTableEnsured = false;

const ensureTableSql = `
  CREATE TABLE IF NOT EXISTS analytics_raw.pg_export_state (
    key TEXT PRIMARY KEY,
    cursor_value TIMESTAMP(3),
    cursor_id TEXT,
    synced_at TIMESTAMP(3) DEFAULT NOW()
  )
`;

const ensureStateTable = async (client: PoolClient) => {
  if (stateTableEnsured) {
    return;
  }
  await client.query(ensureTableSql);
  stateTableEnsured = true;
};

const mapRowToState = (row: { cursor_value: unknown; cursor_id: string | null }): ExportStateRecord => {
  return {
    cursorValue: formatTimestamp(row?.cursor_value),
    cursorId: row?.cursor_id ?? null,
  };
};

export const getExportState = async (key: string): Promise<ExportStateRecord | null> => {
  return withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    const result = await client.query("SELECT cursor_value, cursor_id FROM analytics_raw.pg_export_state WHERE key = $1", [key]);
    if (!result.rowCount) {
      return null;
    }
    return mapRowToState(result.rows[0]);
  });
};

export const updateExportState = async (key: string, cursorValue: string, cursorId?: string | null) => {
  const formattedCursor = formatTimestamp(cursorValue);
  if (!formattedCursor) {
    return;
  }
  await withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    await client.query(
      `
        INSERT INTO analytics_raw.pg_export_state (key, cursor_value, cursor_id, synced_at)
        VALUES ($1, $2::timestamp, $3, NOW())
        ON CONFLICT (key)
        DO UPDATE SET cursor_value = EXCLUDED.cursor_value, cursor_id = EXCLUDED.cursor_id, synced_at = NOW()
      `,
      [key, formattedCursor, cursorId ?? null]
    );
  });
};

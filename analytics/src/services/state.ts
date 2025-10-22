import { PoolClient } from "pg";

import { withAnalyticsClient } from "../db/pg-analytics";
import formatTimestamp from "../utils/format-timestamp";

interface ExportStateRecord {
  cursorValue: string | null;
}

let stateTableEnsured = false;

const ensureTableSql = `
  CREATE TABLE IF NOT EXISTS pg_export_state (
    key TEXT PRIMARY KEY,
    cursor_value TIMESTAMP(3),
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

const mapRowToState = (row: { cursor_value: unknown }): ExportStateRecord => {
  return {
    cursorValue: formatTimestamp(row?.cursor_value),
  };
};

export const getExportState = async (key: string): Promise<ExportStateRecord | null> => {
  return withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    const result = await client.query("SELECT cursor_value FROM pg_export_state WHERE key = $1", [key]);
    if (!result.rowCount) {
      return null;
    }
    return mapRowToState(result.rows[0]);
  });
};

export const updateExportState = async (key: string, cursorValue: string) => {
  const formattedCursor = formatTimestamp(cursorValue);
  if (!formattedCursor) {
    return;
  }
  await withAnalyticsClient(async (client) => {
    await ensureStateTable(client);
    await client.query(
      `
        INSERT INTO pg_export_state (key, cursor_value, synced_at)
        VALUES ($1, $2::timestamp, NOW())
        ON CONFLICT (key)
        DO UPDATE SET cursor_value = EXCLUDED.cursor_value, synced_at = NOW()
      `,
      [key, formattedCursor]
    );
  });
};

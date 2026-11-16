import { withAnalyticsClient } from "../../db/pg-analytics";
import { bulkUpsert } from "../sql";
import { getExportState, updateExportState } from "../state";
import { DailyPublisherUsage } from "./cockpit";
import { METRICS_TABLE } from "./sync";

export const getMetricsCursor = async (): Promise<string | null> => {
  const state = await getExportState(METRICS_TABLE);
  return state?.cursorValue?.slice(0, 10) ?? null;
};

export const writeMetricsDay = async (date: string, rows: DailyPublisherUsage[], cursor: string, batchSize: number): Promise<void> => {
  await withAnalyticsClient(async (client) => {
    await client.query("BEGIN");
    try {
      const syncedAt = new Date();
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize).map((row) => ({ date, ...row, synced_at: syncedAt }));
        for (const isNull of [true, false]) {
          await bulkUpsert(
            client,
            batch.filter((row) => (row.status_code === null) === isNull),
            {
              schema: "analytics_raw",
              table: METRICS_TABLE,
              conflictColumns: isNull ? ["date", "publisher_id", "route"] : ["date", "publisher_id", "route", "status_code"],
              conflictWhere: { column: "status_code", isNull },
            }
          );
        }
      }
      // Même transaction : aucun curseur avancé si un lot échoue.
      await updateExportState(METRICS_TABLE, `${cursor} 00:00:00.000`, null, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
};

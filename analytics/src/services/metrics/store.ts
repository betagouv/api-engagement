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
      // Sept colonnes par ligne, sous la limite des paramètres PostgreSQL.
      const writeBatchSize = Math.min(batchSize, Math.floor(65_535 / 7));
      for (let offset = 0; offset < rows.length; offset += writeBatchSize) {
        const batch = rows.slice(offset, offset + writeBatchSize).map((row) => ({ date, ...row, synced_at: syncedAt }));
        for (const methodIsNull of [true, false]) {
          for (const statusIsNull of [true, false]) {
            await bulkUpsert(
              client,
              batch.filter((row) => (row.method === null) === methodIsNull && (row.status_code === null) === statusIsNull),
              {
                schema: "analytics_raw",
                table: METRICS_TABLE,
                conflictColumns: ["date", "publisher_id", "route", ...(!methodIsNull ? ["method"] : []), ...(!statusIsNull ? ["status_code"] : [])],
                conflictWhere: [
                  { column: "method", isNull: methodIsNull },
                  { column: "status_code", isNull: statusIsNull },
                ],
              }
            );
          }
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

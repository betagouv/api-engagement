import zod from "zod";

import { alertInputSchema, type AlertInput, type AlertParseResult, type AlertProvider } from "@/services/alerts/types";

// Type d'alerte par défaut quand la question Metabase n'a pas de colonne `type` (première alerte : arrêt de tracking).
export const DEFAULT_ALERT_TYPE = "TRACKING_WARNING";
const MAX_ALERTS = 500;

// Payload d'un canal webhook d'alerte Metabase (https://www.metabase.com/docs/latest/configuring-metabase/webhooks) :
// on n'en lit que `data.raw_data.{cols,rows}`, le reste (dont le graphique `visualization`) est ignoré.
const payloadSchema = zod.object({
  type: zod.literal("alert"),
  data: zod.object({
    raw_data: zod.object({ cols: zod.array(zod.unknown()), rows: zod.array(zod.array(zod.unknown())) }),
  }),
});

// Alerte lue telle quelle de la ligne : `type` est validé ensuite contre la liste des types connus.
type RawAlert = Omit<AlertInput, "type"> & { type: string };

const columnName = (col: unknown): string => String(typeof col === "object" && col !== null && "name" in col ? (col as { name: unknown }).name : col).toLowerCase();

// Une ligne de résultat = un annonceur. Colonnes reconnues (insensibles à la casse) : publisher_id (obligatoire),
// type, title, description, procedure_url. Les autres colonnes sont ignorées, les lignes sans publisher_id aussi.
export const alertsFromRows = (cols: unknown[], rows: unknown[][]): RawAlert[] => {
  const index = new Map(cols.map((col, i) => [columnName(col), i]));
  const read = (row: unknown[], name: string): string | undefined => {
    const value = index.has(name) ? row[index.get(name)!] : undefined;
    return value === null || value === undefined || value === "" ? undefined : String(value);
  };

  return rows.flatMap((row) => {
    const publisherId = read(row, "publisher_id");
    if (!publisherId) {
      return [];
    }
    return [
      {
        type: read(row, "type") ?? DEFAULT_ALERT_TYPE,
        publisherId,
        title: read(row, "title"),
        description: read(row, "description"),
        procedureUrl: read(row, "procedure_url"),
      },
    ];
  });
};

export class MetabaseAlertProvider implements AlertProvider {
  parse(payload: unknown): AlertParseResult {
    const body = payloadSchema.safeParse(payload);
    if (!body.success) {
      return body;
    }
    const { cols, rows } = body.data.data.raw_data;
    const alerts = zod.array(alertInputSchema).max(MAX_ALERTS).safeParse(alertsFromRows(cols, rows));
    return alerts.success ? { success: true, data: { alerts: alerts.data, received: rows.length } } : alerts;
  }
}

/**
 * Définitions d'export des évènements de tracking front → analytics_raw.
 *
 * La source est un provider de tracking (cf. src/services/tracking) accédé via une
 * API : il n'y a donc ni schéma ni colonnes SQL, seulement le curseur, l'éventuelle
 * transformation et la table de destination. Volontairement agnostique du provider.
 */
export interface TrackingExportDefinition {
  key: string;
  batchSize?: number;
  cursor: {
    field: string;
    idField?: string;
  };
  transform?: (row: Record<string, any>) => Record<string, any> | null;
  destination: {
    table: string;
    schema?: string;
    conflictColumns: string[];
  };
}

const stringifyJson = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === "string" ? value : JSON.stringify(value);
};

export const trackingExportDefinitions: TrackingExportDefinition[] = [
  {
    key: "tracking_event",
    batchSize: 1000,
    cursor: {
      field: "timestamp",
      idField: "uuid",
    },
    transform: (row) => ({
      ...row,
      properties: stringifyJson(row.properties),
    }),
    destination: {
      table: "tracking_event",
      conflictColumns: ["uuid"],
    },
  },
];

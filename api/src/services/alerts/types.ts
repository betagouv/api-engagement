import zod from "zod";

// Types d'alerte connus (ceux gérés par les vues `admin-warning` / `warnings`).
export const ALERT_TYPES = ["TRACKING_WARNING", "ERROR_WARNING", "EMPTY_WARNING", "VALIDATION_WARNING"] as const;

export const alertInputSchema = zod.object({
  type: zod.enum(ALERT_TYPES),
  publisherId: zod.string().min(1),
  title: zod.string().optional(),
  description: zod.string().optional(),
  procedureUrl: zod
    .string()
    .url()
    .regex(/^https:\/\//, "must be https")
    .optional(),
});
export type AlertInput = zod.infer<typeof alertInputSchema>;

export type AlertParseResult = { success: true; data: { alerts: AlertInput[]; received: number } } | { success: false; error: zod.ZodError };

// Une source d'alertes (Metabase, ...) : transforme le payload brut de son webhook en alertes, sans rien savoir de leur traitement.
export interface AlertProvider {
  // `received` : nombre d'éléments reçus dans le payload (lignes de résultat pour Metabase), toutes lignes confondues.
  parse(payload: unknown): AlertParseResult;
}

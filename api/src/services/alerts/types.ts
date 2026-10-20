import zod from "zod";

export const alertInputSchema = zod.object({
  type: zod.string().min(1),
  publisherId: zod.string().min(1),
  title: zod.string().optional(),
  description: zod.string().optional(),
  procedureUrl: zod.string().url().optional(),
});
export type AlertInput = zod.infer<typeof alertInputSchema>;

export type AlertParseResult = { success: true; data: { alerts: AlertInput[]; received: number } } | { success: false; error: zod.ZodError };

// Une source d'alertes (Metabase, ...) : transforme le payload brut de son webhook en alertes, sans rien savoir de leur traitement.
export interface AlertProvider {
  // `received` : nombre d'éléments reçus dans le payload (lignes de résultat pour Metabase), toutes lignes confondues.
  parse(payload: unknown): AlertParseResult;
}

export type ReportTemplateIds = Record<"ANNONCEUR" | "DIFFUSEUR" | "ANNONCEUR_DIFFUSEUR", number>;

// Cartes utilisées par l’onglet Performance.
export const TOTAL_EVENTS_CARD_IDS = { receive: 5490, send: 5495 };
export const RANKING_CARD_IDS = { receive: 5489, send: 5487 };

export const REPORT_BREVO_TEMPLATE_IDS: ReportTemplateIds = {
  ANNONCEUR: 20,
  DIFFUSEUR: 9,
  ANNONCEUR_DIFFUSEUR: 39,
};

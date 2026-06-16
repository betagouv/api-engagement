// Niveau d'accès requis par carte Metabase :
// - "public" : accessible sans authentification (page /public-stats)
// - "user"   : utilisateur authentifié ; les données sont scopées par variables.publisher_id
// - "admin"  : réservé au rôle admin (cartes globales tous tenants)
// Toute carte absente de cette liste est refusée (empêche l'interrogation de cartes arbitraires).
export type MetabaseCardAccess = "public" | "user" | "admin";

export const METABASE_CARD_ACCESS: Record<string, MetabaseCardAccess> = {
  // Cartes publiques
  "5525": "public", // PUBLIC_STATS_GLOBAL
  "5538": "public", // PUBLIC_STATS_GLOBAL_MONTHLY
  "5528": "public", // PUBLIC_STATS_ACTIVE_MISSIONS
  "5535": "public", // PUBLIC_STATS_ACTIVE_MISSIONS_DEPARTMENT
  "5531": "public", // PUBLIC_STATS_ACTIVE_ORGANIZATIONS
  "5537": "public", // PUBLIC_STATS_MISSIONS_DEPARTMENT
  "5536": "public", // PUBLIC_STATS_MISSIONS_DOMAIN
  // Cartes diffuseur / annonceur (scopées par publisher_id)
  "5497": "user", // EVOLUTION_STAT_EVENT
  "5494": "user", // DIFFUSEUR_TOTAL_MISSIONS
  "5495": "user", // DIFFUSEUR_TOTAL_EVENTS
  "5496": "user", // DIFFUSEUR_REPARITION_PAR_MOYEN_DIFFUSION
  "5487": "user", // DIFFUSEUR_PERFORMANCE_ANNONCEURS
  "5488": "user", // DIFFUSEUR_REPARITION_PAR_ANNONCEURS
  "5518": "user", // DIFFUSEUR_MEAN_PUBLISHER_KPI
  "5519": "user", // DIFFUSEUR_PERFORMANCE_PER_SOURCE
  "5490": "user", // ANNONCEUR_TOTAL_EVENTS
  "5498": "user", // ANNONCEUR_TOTAL_MISSIONS
  "5489": "user", // ANNONCEUR_TOP_DIFFUSEURS
  // Cartes admin globales
  "5726": "admin", // ADMIN_STATS_ENGAGEMENT_REDIRECTIONS
  "5727": "admin", // ADMIN_STATS_ENGAGEMENT_CANDIDATURES
  "5728": "admin", // ADMIN_STATS_MISSIONS_ACTIVES
  "5729": "admin", // ADMIN_STATS_MISSIONS_CREEES
  "5730": "admin", // ADMIN_STATS_TOP_DIFFUSEURS
  "5731": "admin", // ADMIN_STATS_TOP_ANNONCEURS
  "5742": "admin", // ADMIN_STATS_PARTNERS_TABLE
};

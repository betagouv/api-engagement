// Contrats du service de tracking, volontairement agnostiques de l'outil sous-jacent
// (PostHog, Umami, Plausible, Matomo, ...). Un provider concret implémente `TrackingProvider`.

// Propriétés associées à un évènement. On reste large pour ne pas contraindre les providers,
// mais on évite d'y mettre des données personnelles (cf. règles de sécurité du dépôt).
// Les tableaux sont supportés (ex. réponses multi-sélection envoyées à PostHog).
export type TrackingProperties = Record<string, string | number | boolean | null | undefined | string[]>;

// Identité optionnelle de l'utilisateur courant. `distinctId` correspond à l'id anonyme déjà
// utilisé par le quiz (`useQuizStore.distinctId`).
export type TrackingTraits = Record<string, string | number | boolean | null | undefined>;

// Interface qu'un provider doit implémenter. `identify` et `init` sont optionnels :
// tous les outils ne les supportent pas (ex. Plausible n'a pas d'identification).
export interface TrackingProvider {
  // Nom lisible du provider, utile pour le debug.
  readonly name: string;
  // Initialisation côté navigateur (chargement du SDK, configuration). Idempotent.
  init?(): void | Promise<void>;
  // Enregistre un évènement avec ses propriétés.
  track(event: string, properties?: TrackingProperties): void;
  // Associe l'utilisateur courant à un identifiant et, éventuellement, des traits.
  identify?(distinctId: string, traits?: TrackingTraits): void;
  // Enregistre des "super properties" attachées automatiquement à tous les évènements suivants.
  register?(properties: TrackingProperties): void;
}

// Providers supportés : `posthog` en production, `local` (console.log) pour le développement.
export type TrackingProviderName = "local" | "posthog";

// ============================================================================
// Types des évènements métier (émetteurs dans ./events, helpers dans ./utils)
// ============================================================================

// Catégorie du plan de télémétrie (documentation/priorisation, non envoyée à PostHog).
export type EventCategory = "lifecycle" | "core_value" | "feature_usage";

// --- mission.clicked ---
// Surface d'où provient le clic sur une carte mission.
export type MissionClickedSection = "pinned" | "other" | "homepage_examples" | "missions_list" | "similar";
// Page sur laquelle se trouve l'utilisateur au moment du clic.
export type MissionClickedEntryPage = "results" | "homepage" | "missions_list";

export interface MissionClickedPayload {
  mission_id: string;
  publisher_id: string;
  publisher_name: string;
  section: MissionClickedSection;
  // Position ordinale dans la liste affichée (1 = première). Null pour les listes non classées.
  rank: number | null;
  mission_domain: string | null;
  // Valeur de la taxonomie `type_mission` (ponctuelle, reguliere, temps_plein, ...).
  mission_type: string | null;
  // true si le clic mène vers le site annonceur externe (et non vers le détail interne).
  opens_external: boolean;
  // Distance user ↔ mission fournie par le backend. Null hors sections pinned/other.
  distance_km: number | null;
  entry_page: MissionClickedEntryPage;
}

// --- quiz ---
// Provenance de l'entrée dans le quiz.
export type QuizEntrySource = "homepage_cta" | "direct" | "missions_list" | "change_results_cta" | "external";
// Mode de complétion : "full" (parcours jusqu'au bout) ou "shortcut" (bouton "Voir mes résultats").
export type QuizCompletionType = "full" | "shortcut";

// --- mission_detail.viewed ---
// Provenance de l'ouverture d'une fiche mission.
export type MissionDetailEntrySource = "results_pinned" | "results_other" | "missions_list" | "homepage" | "direct";
// State de navigation transmis par les cartes mission vers la fiche détail (entry_source + rang).
export type MissionDetailNavState = { entrySource: MissionDetailEntrySource; rank?: number };

// --- missions_filter.applied ---
export type MissionsFilterType = "departement" | "tranche_age" | "type_mission" | "secteur_activite" | "domaine";

// --- emails ---
// Provenance de la fiche depuis laquelle l'email d'une mission est envoyé.
export type EmailMissionDetailEntrySource = "results" | "missions_list" | "direct";

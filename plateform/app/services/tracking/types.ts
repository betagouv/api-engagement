// Contrats du service de tracking, volontairement agnostiques de l'outil sous-jacent
// (PostHog, Umami, Plausible, Matomo, ...). Un provider concret implémente `TrackingProvider`.

// Propriétés associées à un évènement. On reste large pour ne pas contraindre les providers,
// mais on évite d'y mettre des données personnelles (cf. règles de sécurité du dépôt).
// Les tableaux sont supportés (ex. réponses multi-sélection envoyées à PostHog).
export type TrackingProperties = Record<string, string | number | boolean | null | undefined | string[]>;

// Identité optionnelle de l'utilisateur courant. `distinctId` correspond à l'id anonyme déjà
// utilisé par le quiz (`useQuizStore.distinctId`).
export type TrackingTraits = Record<string, string | number | boolean | null | undefined>;

// État de consentement analytique partagé entre le gestionnaire de cookies et le provider.
// `pending` et `denied` autorisent uniquement le mode cookieless PostHog ; `granted` active la
// persistance ainsi que l'identification.
export type TrackingConsentStatus = "pending" | "denied" | "granted";

// Interface qu'un provider doit implémenter. `identify` et `init` sont optionnels :
// tous les outils ne les supportent pas (ex. Plausible n'a pas d'identification).
export interface TrackingProvider {
  // Nom lisible du provider, utile pour le debug.
  readonly name: string;
  // Initialisation côté navigateur (chargement du SDK, configuration). Idempotent.
  init?(): void | Promise<void>;
  // Synchronise le choix du gestionnaire de cookies avec le provider. Idempotent.
  setConsentStatus?(status: TrackingConsentStatus): void;
  // Enregistre un évènement avec ses propriétés.
  track(event: string, properties?: TrackingProperties): void;
  // Associe l'utilisateur courant à un identifiant et, éventuellement, des traits.
  identify?(distinctId: string, traits?: TrackingTraits): void;
  // Enregistre des "super properties" attachées automatiquement à tous les évènements suivants.
  register?(properties: TrackingProperties): void;
  // Retire une super property attachée automatiquement aux évènements suivants.
  unregister?(property: string): void;
}

// Providers supportés : `posthog` en production, `local` (console.log) pour le développement.
export type TrackingProviderName = "local" | "posthog";

// ============================================================================
// Types des évènements métier (émetteurs dans ./events, helpers dans ./utils)
// ============================================================================

// Catégorie du plan de télémétrie (documentation/priorisation, non envoyée à PostHog).
export type EventCategory = "lifecycle" | "core_value" | "feature_usage";

// Landings marketing (cf. routes/landings) : identifiées par un slug préfixé `landing_` plutôt
// qu'énumérées, pour ne pas avoir à étendre les unions ci-dessous à chaque nouvelle landing.
// Ex. "landing_defis_engagement".
export type LandingName = `landing_${string}`;

// --- page.viewed ---
// Page visitée (discriminant du pageview manuel : capture_pageview est désactivé côté PostHog).
export type PageViewedPageName = "homepage" | "missions_list" | LandingName;

// --- cta.clicked ---
// Clic sur un CTA d'une landing. `cta_destination` = cible métier (union stable, partagée entre landings),
// `cta_section` = bloc de la page : slug spécifique à chaque landing, laissé en `string` (comme LandingName)
// pour ne pas maintenir ici la liste des sections de toutes les landings.
export type CtaSection = string;
export type CtaDestination = "quiz" | "missions_list";

// --- mission.clicked ---
// Surface d'où provient le clic sur une carte mission. Sur les résultats : `list` (liste paginée) et
// `map` (clic sur la carte de prévisualisation de la mission sur la map).
export type MissionClickedSection = "list" | "map" | "homepage_examples" | "missions_list" | "similar" | LandingName;
// Page sur laquelle se trouve l'utilisateur au moment du clic.
export type MissionClickedEntryPage = "results" | "homepage" | "missions_list" | LandingName;

export interface MissionClickedPayload {
  mission_id: string;
  publisher_id: string;
  publisher_name: string;
  section: MissionClickedSection;
  // Position ordinale dans le scoring (1 = première, continue au-delà de 10). Null pour les listes non classées.
  rank: number | null;
  // Numéro de page de la liste paginée au moment du clic. Null hors résultats paginés.
  page_number: number | null;
  mission_domain: string | null;
  // Valeur de la taxonomie `type_mission` (ponctuelle, reguliere, temps_plein, ...).
  mission_type: string | null;
  // true si le clic mène vers le site annonceur externe (et non vers le détail interne).
  opens_external: boolean;
  // Distance user ↔ mission fournie par le backend. Null hors résultats géolocalisés (list/map).
  distance_km: number | null;
  entry_page: MissionClickedEntryPage;
}

// --- quiz ---
// Provenance de l'entrée dans le quiz. `my_profile_modal` : CTA « Refaire le quiz » de la modale
// « Ce qu'on a compris de toi » (bouton « Ton profil » en page de résultats).
export type QuizEntrySource = "homepage_cta" | "direct" | "missions_list" | "change_results_cta" | "my_profile_modal" | "external" | `${LandingName}_cta`;
// Bloc de la landing d'où part le CTA quiz (à côté de `entrySource`), pour savoir quel CTA a été cliqué.
export type QuizEntrySection = "hero" | "etapes";
// Mode de complétion : "full" (parcours jusqu'au bout) ou "shortcut" (bouton "Voir mes résultats").
export type QuizCompletionType = "full" | "shortcut";

// --- mission_detail.viewed ---
// Provenance de l'ouverture d'une fiche mission. `results_list` (liste paginée) et `results_map`
// (aperçu de la mission sur la map) remplacent les anciennes sections pinned/other.
export type MissionDetailEntrySource = "results_list" | "results_map" | "missions_list" | "homepage" | "direct" | LandingName;
// State de navigation transmis par les cartes mission vers la fiche détail (entry_source + rang).
// `backTo` : page vers laquelle renvoie le bouton "Retour" hors parcours résultats (ex. landings).
export type MissionDetailNavState = { entrySource: MissionDetailEntrySource; rank?: number; backTo?: string };

// --- missions_filter.applied ---
export type MissionsFilterType = "departement" | "dispositif" | "tranche_age" | "type_mission" | "secteur_activite" | "domaine";

// --- emails ---
// Provenance de la fiche depuis laquelle l'email d'une mission est envoyé. `results_card` : CTA email
// d'une carte mission en page de résultats (envoi sans passer par la fiche détail).
export type EmailMissionDetailEntrySource = "results" | "results_card" | "missions_list" | "direct";
// Page d'où part l'envoi de la sélection complète : résultats du quiz, ou une landing (carte mission).
export type EmailMissionsEntryPage = "results" | LandingName;

// --- results.page_changed ---
// Contrôle de pagination utilisé : boutons Précédent/Suivant, ou clic sur un numéro (`direct`), le
// numéro pouvant être la 1re (`first`) ou la dernière (`last`) page.
export type ResultsPageNavigationType = "next" | "previous" | "direct" | "first" | "last";

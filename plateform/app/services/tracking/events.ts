import type { MissionBrowse, MissionMatchItem } from "@engagement/dto";

import { track } from "./index";

// Catalogue des évènements métier tracés côté front. Centralise le nom de l'évènement et la forme
// de ses propriétés (spec produit, propriétés en snake_case côté PostHog).

// Catégories du plan de télémétrie. Convention de documentation et de priorisation UNIQUEMENT :
// elles ne sont pas envoyées à PostHog (PostHog n'a pas de notion native de catégorie).
//   - lifecycle    : début/fin d'un parcours utilisateur (ex. quiz.started, évènement de référence)
//   - core_value   : actions cœur de la plateforme (quiz.completed, results.viewed, mission.clicked)
//   - feature_usage: fonctionnalités secondaires (filtres, emails, navigation détail, raccourcis)
// Ordre d'implémentation : lifecycle + core_value d'abord, feature_usage ensuite.
export type EventCategory = "lifecycle" | "core_value" | "feature_usage";

// Associe chaque évènement du plan à sa catégorie (référence documentaire, non transmise).
export const EVENT_CATALOG = {
  "quiz.started": "lifecycle",
  "quiz.completed": "core_value",
  "results.viewed": "core_value",
  "mission.clicked": "core_value",
  // feature_usage (filtres, emails, navigation détail, raccourcis) : à cataloguer à l'implémentation.
} satisfies Record<string, EventCategory>;

// Surface d'où provient le clic sur une carte mission.
export type MissionClickedSection = "pinned" | "other" | "homepage_examples" | "missions_list" | "similar";
// Page sur laquelle se trouve l'utilisateur au moment du clic.
export type MissionClickedEntryPage = "results" | "homepage" | "missions_list";

interface MissionClickedPayload {
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
  quiz_session_id: string | null;
  entry_page: MissionClickedEntryPage;
}

// `mission.clicked` : clic sur une carte mission (résultats, liste, homepage, similarité).
function trackMissionClicked(payload: MissionClickedPayload): void {
  track("mission.clicked", { ...payload });
}

// Clic depuis un résultat de matching (sections pinned / other / similar) : navigation interne
// vers le détail → `opens_external: false`.
export function trackMissionClickedFromMatch(
  item: MissionMatchItem,
  context: {
    section: Extract<MissionClickedSection, "pinned" | "other" | "similar">;
    entryPage: MissionClickedEntryPage;
    rank: number | null;
    quizSessionId?: string | null;
  },
): void {
  trackMissionClicked({
    mission_id: item.mission.id,
    publisher_id: item.mission.publisherId ?? "",
    publisher_name: item.mission.publisherName ?? "",
    section: context.section,
    rank: context.rank,
    mission_domain: item.mission.domain,
    mission_type: item.match.values.find((value) => value.taxonomyKey === "type_mission")?.taxonomyValueKey ?? null,
    opens_external: false,
    // Spec : distance pertinente uniquement pour les sections pinned/other (résultats géolocalisés).
    distance_km: context.section === "similar" ? null : (item.mission.location.distanceKm ?? null),
    quiz_session_id: context.quizSessionId ?? null,
    entry_page: context.entryPage,
  });
}

// `results.viewed` (core_value) : chargement de la page /results avec ses missions.
export function trackResultsViewed(params: { quizSessionId: string; pinnedCount: number; totalResultsCount: number; avgDistanceKmTop5?: number | null }): void {
  track("results.viewed", {
    quiz_session_id: params.quizSessionId,
    has_results: params.pinnedCount > 0,
    pinned_count: params.pinnedCount,
    total_results_count: params.totalResultsCount,
    avg_distance_km_top5: params.avgDistanceKmTop5 ?? null,
  });
}

// Clic depuis une mission "browse" (liste /missions ou exemples de la homepage).
export function trackMissionClickedFromBrowse(
  mission: MissionBrowse,
  context: {
    section: Extract<MissionClickedSection, "missions_list" | "homepage_examples">;
    entryPage: MissionClickedEntryPage;
    opensExternal: boolean;
  },
): void {
  trackMissionClicked({
    mission_id: mission.id,
    publisher_id: mission.publisherId ?? "",
    publisher_name: mission.publisherName ?? "",
    section: context.section,
    // Listes non classées (spec) → rank null.
    rank: null,
    mission_domain: mission.domain,
    // Pas de scoring sur le flux browse → type_mission indisponible ici.
    mission_type: null,
    opens_external: context.opensExternal,
    distance_km: null,
    quiz_session_id: null,
    entry_page: context.entryPage,
  });
}

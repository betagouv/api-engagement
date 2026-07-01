import type { MissionMatchItem } from "@engagement/dto";

import MissionCard from "~/components/missions/mission-card";
import { trackMissionClickedFromMatch } from "~/services/tracking/events";
import type { MissionDetailEntrySource, MissionDetailNavState } from "~/services/tracking/types";
import { buildMissionDetailHref, matchResultToBrowseMission } from "~/utils/mission";

// Sections de résultats (matching) et leur entry_source de fiche détail correspondante.
// `similar` n'a pas de provenance détail dédiée (→ pas de nav state, resolve en "direct").
type MatchSection = "pinned" | "other" | "similar";
const DETAIL_ENTRY_SOURCE_BY_SECTION: Record<Exclude<MatchSection, "similar">, MissionDetailEntrySource> = {
  pinned: "results_pinned",
  other: "results_other",
};

// Carte mission issue d'un résultat de matching, avec son instrumentation : `mission.clicked`
// au clic + transmission de l'entry_source/rank à la fiche détail (pour `mission_detail.viewed`).
// Centralise la corrélation section ↔ entry_source pour éviter de la recopier à chaque call site.
export default function MatchMissionCard({ item, section, rank, userScoringId }: { item: MissionMatchItem; section: MatchSection; rank: number; userScoringId?: string }) {
  const entrySource = section === "similar" ? undefined : DETAIL_ENTRY_SOURCE_BY_SECTION[section];
  const state: MissionDetailNavState | undefined = entrySource ? { entrySource, rank } : undefined;

  return (
    <MissionCard
      mission={matchResultToBrowseMission(item)}
      link={{ type: "internal", to: buildMissionDetailHref(item, userScoringId), state }}
      onClick={() => trackMissionClickedFromMatch(item, { section, entryPage: "results", rank })}
    />
  );
}

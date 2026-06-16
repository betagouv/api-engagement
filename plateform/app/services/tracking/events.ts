import type { MissionMatchItem } from "@engagement/dto";

import { track } from "./index";

// Catalogue des évènements métier tracés côté front. Centraliser ici le nom de l'évènement
// et la forme de ses propriétés évite de dupliquer ces chaînes dans les composants et garde
// le service principal (`./index`) agnostique du domaine.

// Origine du clic sur une mission au sein de la page résultats.
export type MissionClickedSource = "pinned" | "other" | "map";

interface MissionClickedContext {
  source: MissionClickedSource;
  // Rang de la mission dans sa liste (1-indexé), pour analyser l'impact du classement.
  position: number;
  userScoringId?: string;
  // Page courante quand la mission vient d'une liste paginée ("other").
  page?: number;
}

// `mission.clicked` : l'utilisateur ouvre le détail d'une mission depuis ses résultats de quiz.
export function trackMissionClicked(item: MissionMatchItem, context: MissionClickedContext): void {
  track("mission.clicked", {
    missionId: item.mission.id,
    publisherName: item.mission.publisherName,
    score: item.match.totalScore,
    source: context.source,
    position: context.position,
    page: context.page,
    userScoringId: context.userScoringId,
  });
}

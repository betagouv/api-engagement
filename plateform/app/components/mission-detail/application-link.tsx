import type { MissionDetailResponse } from "@engagement/dto";
import type { MouseEvent } from "react";
import { trackMissionClickedFromDetail } from "~/services/tracking/events";
import { buildMissionApplicationHref } from "~/utils/mission";

export default function MissionApplicationLink({ mission, userScoringId, className }: { mission: MissionDetailResponse; userScoringId?: string; className: string }) {
  const refreshHref = (event: MouseEvent<HTMLAnchorElement>) => {
    // Le tag est asynchrone et le cookie peut changer depuis un autre onglet.
    event.currentTarget.href = buildMissionApplicationHref(mission.applicationUrl, userScoringId);
  };

  return (
    <a
      href={buildMissionApplicationHref(mission.applicationUrl, userScoringId, "")}
      target="_blank"
      rel="noopener noreferrer"
      title="Découvrir la mission - nouvelle fenêtre"
      className={className}
      onClick={(event) => {
        refreshHref(event);
        trackMissionClickedFromDetail(mission);
      }}
      onAuxClick={refreshHref}
      onContextMenu={refreshHref}
    >
      Découvrir la mission
    </a>
  );
}

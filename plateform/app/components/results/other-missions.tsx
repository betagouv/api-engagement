import type { MissionMatchItem } from "@engagement/dto";
import MissionCard from "~/components/missions/mission-card";
import { DebugButton } from "~/components/results/matching-debug-modal";
import Pagination from "~/components/ui/pagination";
import { trackMissionClickedFromMatch } from "~/services/tracking/events";
import { buildMissionDetailHref, matchResultToBrowseMission } from "~/utils/mission";

interface OtherMissionsProps {
  items: MissionMatchItem[];
  page: number;
  hasNextPage: boolean;
  pageLoading: boolean;
  visiblePageNumbers: number[];
  userScoringId: string | undefined;
  showDebug: boolean;
  gridClassName?: string;
  onPageChange: (page: number) => void;
}

export default function OtherMissions({
  items,
  page,
  hasNextPage,
  pageLoading,
  visiblePageNumbers,
  userScoringId,
  showDebug,
  gridClassName = "grid grid-cols-1 gap-6",
  onPageChange,
}: OtherMissionsProps) {
  return (
    <>
      <h2 className="fr-h5 mb-4!">Il y a d'autres missions qui peuvent te plaire</h2>

      {pageLoading ? (
        <p className="text-mention-grey py-8 text-sm">Chargement…</p>
      ) : (
        <div className={gridClassName}>
          {items.map((item, index) => (
            <div key={item.mission.id} className="relative">
              <MissionCard
                mission={matchResultToBrowseMission(item)}
                link={{ type: "internal", to: buildMissionDetailHref(item, userScoringId) }}
                onClick={() => trackMissionClickedFromMatch(item, { section: "other", entryPage: "results", rank: index + 1, quizSessionId: userScoringId })}
              />
              {showDebug && <DebugButton missionId={item.mission.id} />}
            </div>
          ))}
        </div>
      )}

      <div className="fr-mt-3w">
        <Pagination
          page={page}
          totalPages={Math.max(page, ...visiblePageNumbers)}
          pageItems={visiblePageNumbers}
          hasNextPage={hasNextPage}
          disabled={pageLoading}
          ariaLabel="Pagination des autres missions"
          onPageChange={onPageChange}
        />
      </div>
    </>
  );
}

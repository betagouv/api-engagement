import type { MissionMatchItem } from "@engagement/dto";
import MatchMissionCard from "~/components/missions/match-mission-card";
import { DebugButton } from "~/components/results/matching-debug-modal";
import Pagination from "~/components/ui/pagination";
import { OTHER_RESULTS_PAGE_SIZE } from "~/services/matching";

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
          {items.map((item, index) => {
            // Rang dans la section "other", 1-based et tenant compte de la pagination
            // (page 1 → 1..pageSize, page 2 → pageSize+1.., etc.). Indépendant des missions pinned.
            const rank = (page - 1) * OTHER_RESULTS_PAGE_SIZE + index + 1;
            return (
              <div key={item.mission.id} className="relative">
                <MatchMissionCard item={item} section="other" rank={rank} userScoringId={userScoringId} />
                {showDebug && <DebugButton missionId={item.mission.id} />}
              </div>
            );
          })}
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

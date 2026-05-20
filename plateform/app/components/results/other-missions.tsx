import MissionCard from "~/components/missions/mission-card";
import Pagination from "~/components/ui/pagination";
import type { ReactNode } from "react";
import type { MissionMatchItem } from "@engagement/dto";
import { matchResultToBrowseMission } from "~/utils/mission";

interface OtherMissionsProps {
  items: MissionMatchItem[];
  page: number;
  pageLoading: boolean;
  hasNextPage: boolean;
  pageItems: number[];
  userScoringId: string | undefined;
  onPageChange: (page: number) => void;
  renderAction: (item: MissionMatchItem) => ReactNode;
}

export default function OtherMissions({ items, page, pageLoading, hasNextPage, pageItems, userScoringId, onPageChange, renderAction }: OtherMissionsProps) {
  if (items.length === 0 && page === 1) return null;

  return (
    <div className="px-6 pb-10">
      <section className="mx-auto max-w-7xl">
        <h2 className="fr-h4 fr-mb-3w">Il y a d'autres missions qui peuvent te plaire</h2>

        {pageLoading ? (
          <p className="text-mention-grey py-8 text-sm">Chargement…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <MissionCard
                key={item.mission.id}
                mission={matchResultToBrowseMission(item)}
                link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                action={renderAction(item)}
              />
            ))}
          </div>
        )}

        <div className="fr-mt-3w">
          <Pagination
            page={page}
            totalPages={Math.max(page, ...pageItems)}
            pageItems={pageItems}
            hasNextPage={hasNextPage}
            disabled={pageLoading}
            ariaLabel="Pagination des autres missions"
            onPageChange={onPageChange}
          />
        </div>
      </section>
    </div>
  );
}

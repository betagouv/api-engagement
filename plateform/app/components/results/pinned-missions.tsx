import type { MissionMatchItem } from "@engagement/dto";
import type { ReactNode } from "react";
import { Link } from "react-router";
import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import { matchResultToBrowseMission } from "~/utils/mission";

interface PinnedMissionsProps {
  items: MissionMatchItem[];
  loading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  onResetAnswers: () => void;
  renderAction: (item: MissionMatchItem) => ReactNode;
}

export default function PinnedMissions({ items, loading, error, userScoringId, onResetAnswers, renderAction }: PinnedMissionsProps) {
  return (
    <div className="relative z-[1200] -mt-12 w-full rounded-t-[1.5rem] bg-white pt-7 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:rounded-none md:bg-transparent md:pt-0 md:shadow-none">
      <div className="flex items-center justify-between px-5 pb-2 md:px-6 md:pt-6">
        {!loading && !error && (
          <h1 className="fr-h3 mb-0!">
            <span className="text-highlighted">
              {items.length} mission{items.length > 1 ? "s" : ""}
            </span>{" "}
            pour toi
          </h1>
        )}

        <Link to="/quiz/age" onClick={onResetAnswers} className="fr-link fr-link--sm shrink-0">
          Changer mes réponses
        </Link>
      </div>

      {!loading && !error && items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-6 px-5 pb-6 md:px-6">
            {items.map((item) => (
              <div key={item.mission.id} className="relative w-full md:max-w-[330px]">
                <MissionCard
                  mission={matchResultToBrowseMission(item)}
                  link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                />
                {renderAction(item)}
              </div>
            ))}
          </div>

          <div className="px-5 pb-8 md:px-6">
            <EmailMissionsModal userScoringId={userScoringId} />
          </div>
        </>
      )}
    </div>
  );
}

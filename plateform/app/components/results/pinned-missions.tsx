import type { MissionMatchItem } from "@engagement/dto";
import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import { DebugButton } from "~/components/results/matching-debug-modal";
import { matchResultToBrowseMission } from "~/utils/mission";

interface PinnedMissionsProps {
  items: MissionMatchItem[];
  loading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  onResetAnswers: () => void;
}

export default function PinnedMissions({ items, loading, error, userScoringId, onResetAnswers }: PinnedMissionsProps) {
  return (
    <div className="relative w-full px-6">
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 pb-6 md:grid-cols-2 md:px-4">
            {items.map((item) => (
              <div key={item.mission.id} className="relative w-full md:max-w-[330px]">
                <MissionCard
                  mission={matchResultToBrowseMission(item)}
                  link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                />
                <DebugButton missionId={item.mission.id} />
              </div>
            ))}
          </div>

          <div className="pb-8 md:px-6">
            <EmailMissionsModal userScoringId={userScoringId} />
          </div>
        </>
      )}
    </div>
  );
}

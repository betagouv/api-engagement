import type { MissionMatchItem } from "@engagement/dto";
import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import { DebugButton } from "~/components/results/matching-debug-modal";
import { buildMissionDetailHref, matchResultToBrowseMission } from "~/utils/mission";

interface PinnedMissionsProps {
  items: MissionMatchItem[];
  loading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  showDebug: boolean;
  highlightedMissionId?: string | null;
  onMissionHover?: (missionId: string | null) => void;
}

export default function PinnedMissions({ items, loading, error, userScoringId, showDebug, highlightedMissionId, onMissionHover }: PinnedMissionsProps) {
  return (
    <div className="relative w-full px-6">
      {!loading && error && (
        <div className="fr-alert fr-alert--error my-6" role="alert">
          <h3 className="fr-alert__title">Une erreur est survenue</h3>
          <p>{error}</p>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 pb-6 md:grid-cols-2 md:px-4">
            {items.map((item) => (
              <div
                key={item.mission.id}
                className={`relative w-full transition-shadow md:max-w-[330px] ${item.mission.id === highlightedMissionId ? "shadow-card ring-2 ring-blue-france-sun" : ""}`}
                onMouseEnter={() => onMissionHover?.(item.mission.id)}
                onMouseLeave={() => onMissionHover?.(null)}
              >
                <MissionCard mission={matchResultToBrowseMission(item)} link={{ type: "internal", to: buildMissionDetailHref(item, userScoringId) }} />
                {showDebug && <DebugButton missionId={item.mission.id} />}
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

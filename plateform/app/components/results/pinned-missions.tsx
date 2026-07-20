import type { MissionMatchItem } from "@engagement/dto";
import MatchMissionCard from "~/components/missions/match-mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import { DebugButton } from "~/components/results/matching-debug-modal";

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
          {/* RGAA 9.1 : en état d'erreur le h1 « X missions pour toi » n'est pas rendu — ce titre devient le titre principal de la page. */}
          <h1 className="fr-alert__title">Une erreur est survenue</h1>
          <p>{error}</p>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          {/* RGAA 9.1 : titre de section masqué — les cartes mission sont des <h3>, le h1 « X missions pour toi » est le seul titre visible au-dessus. */}
          <h2 className="fr-sr-only">Les missions sélectionnées pour toi</h2>
          <div className="grid grid-cols-1 gap-6 pb-6 md:grid-cols-2 md:px-4">
            {items.map((item, index) => (
              <div
                key={item.mission.id}
                className={`relative w-full transition-shadow md:max-w-[330px] ${item.mission.id === highlightedMissionId ? "shadow-card ring-2 ring-blue-france-sun" : ""}`}
                onMouseEnter={() => onMissionHover?.(item.mission.id)}
                onMouseLeave={() => onMissionHover?.(null)}
              >
                <MatchMissionCard item={item} section="pinned" rank={index + 1} userScoringId={userScoringId} />
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

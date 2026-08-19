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
  onEmailClick?: (missionId: string) => void;
}

export default function PinnedMissions({ items, loading, error, userScoringId, showDebug, highlightedMissionId, onMissionHover, onEmailClick }: PinnedMissionsProps) {
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
          <ul role="list" className="grid grid-cols-1 gap-6 list-none! p-0! m-0! lg:grid-cols-2">
            {items.map((item, index) => (
              <li
                key={item.mission.id}
                className={`relative w-full transition-shadow p-0! m-0! ${item.mission.id === highlightedMissionId ? "shadow-card ring-2 ring-blue-france-sun hover:ring-0" : ""}`}
                onMouseEnter={() => onMissionHover?.(item.mission.id)}
                onMouseLeave={() => onMissionHover?.(null)}
              >
                <MatchMissionCard item={item} section="pinned" rank={index + 1} userScoringId={userScoringId} onEmailClick={onEmailClick} />
                {showDebug && <DebugButton missionId={item.mission.id} />}
              </li>
            ))}
          </ul>

          <div className="mt-6 w-full pb-8">
            <EmailMissionsModal userScoringId={userScoringId} />
          </div>
        </>
      )}
    </div>
  );
}

import type { MissionMatchItem } from "@engagement/dto";
import MatchMissionCard from "~/components/missions/match-mission-card";
import { DebugButton } from "~/components/results/matching-debug-modal";
import Pagination from "~/components/ui/pagination";
import { RESULTS_PAGE_SIZE } from "~/services/matching";

interface ResultsMissionsProps {
  items: MissionMatchItem[];
  page: number;
  totalPages: number;
  loading: boolean;
  pageLoading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  showDebug: boolean;
  highlightedMissionId?: string | null;
  onMissionHover?: (missionId: string | null) => void;
  onEmailClick?: (missionId: string) => void;
  onPageChange: (page: number) => void;
}

// Liste paginée unique des résultats de matching (plus de distinction pinned / autres missions) :
// les missions affichées sont celles de la page courante, également reprises sur la map.
export default function ResultsMissions({
  items,
  page,
  totalPages,
  loading,
  pageLoading,
  error,
  userScoringId,
  showDebug,
  highlightedMissionId,
  onMissionHover,
  onEmailClick,
  onPageChange,
}: ResultsMissionsProps) {
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
          {pageLoading ? (
            <p role="status" className="text-mention-grey py-8 text-sm">
              Chargement…
            </p>
          ) : (
            <ul role="list" className="grid grid-cols-1 gap-6 list-none! p-0! m-0! lg:grid-cols-2">
              {items.map((item, index) => (
                <li
                  key={item.mission.id}
                  className={`relative w-full transition-shadow p-0! m-0! ${item.mission.id === highlightedMissionId ? "shadow-card ring-2 ring-blue-france-sun hover:ring-0" : ""}`}
                  onMouseEnter={() => onMissionHover?.(item.mission.id)}
                  onMouseLeave={() => onMissionHover?.(null)}
                >
                  <MatchMissionCard item={item} section="pinned" rank={(page - 1) * RESULTS_PAGE_SIZE + index + 1} userScoringId={userScoringId} onEmailClick={onEmailClick} />
                  {showDebug && <DebugButton missionId={item.mission.id} />}
                </li>
              ))}
            </ul>
          )}

          <div className="fr-mt-3w pb-8">
            <Pagination page={page} totalPages={totalPages} disabled={pageLoading} ariaLabel="Pagination des résultats" onPageChange={onPageChange} />
          </div>
        </>
      )}
    </div>
  );
}

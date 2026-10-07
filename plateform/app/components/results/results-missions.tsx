import type { MissionMatchItem } from "@engagement/dto";
import MatchMissionCard from "~/components/missions/match-mission-card";
import { DebugButton } from "~/components/results/matching-debug-modal";
import MissionAlertBanner from "~/components/results/mission-alert-banner";
import Pagination, { type PaginationTrigger } from "~/components/ui/pagination";
import Spinner from "~/components/ui/spinner";
import { RESULTS_PAGE_SIZE } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";

// Le bandeau d'alerte s'insère après les 4 premières missions de la page (2 rangées en desktop).
const MISSION_ALERT_BANNER_POSITION = 4;
const MISSIONS_LIST_CLASS_NAME = "grid grid-cols-1 gap-6 list-none! p-0! m-0! lg:grid-cols-2";

interface ResultsMissionsProps {
  items: MissionMatchItem[];
  page: number;
  totalPages: number;
  loading: boolean;
  pageLoading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  userValueKeys: ReadonlySet<string>;
  showDebug: boolean;
  highlightedMissionId?: string | null;
  onMissionHover?: (missionId: string | null) => void;
  onEmailClick?: (mission: MissionMatchItem["mission"]) => void;
  onPageChange: (page: number, trigger: PaginationTrigger) => void;
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
  userValueKeys,
  showDebug,
  highlightedMissionId,
  onMissionHover,
  onEmailClick,
  onPageChange,
}: ResultsMissionsProps) {
  const emailScoringId = useQuizStore((s) => s.emailScoringId);
  const renderMission = (item: MissionMatchItem, index: number) => (
    <li
      key={item.mission.id}
      id={`mission-${item.mission.id}`}
      className={`relative w-full transition-shadow p-0! m-0! ${item.mission.id === highlightedMissionId ? "shadow-card ring-2 ring-blue-france-sun hover:ring-0" : ""}`}
      onMouseEnter={() => onMissionHover?.(item.mission.id)}
      onMouseLeave={() => onMissionHover?.(null)}
    >
      <MatchMissionCard
        item={item}
        section="list"
        rank={(page - 1) * RESULTS_PAGE_SIZE + index + 1}
        pageNumber={page}
        userScoringId={userScoringId}
        userValueKeys={userValueKeys}
        onEmailClick={onEmailClick}
      />
      {showDebug && <DebugButton missionId={item.mission.id} />}
    </li>
  );

  return (
    <div className="relative w-full px-6" aria-busy={loading || pageLoading}>
      {loading && <Spinner label="Chargement des missions…" className="justify-center py-12" />}
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
            <Spinner label="Chargement des missions…" className="justify-center py-12" />
          ) : (
            <>
              <ul role="list" className={MISSIONS_LIST_CLASS_NAME}>
                {items.slice(0, MISSION_ALERT_BANNER_POSITION).map(renderMission)}
              </ul>
              {/* Email déjà laissé sur l'étape email du quiz : pas besoin de le redemander. */}
              {userScoringId && emailScoringId === userScoringId ? <div className="h-6" /> : <MissionAlertBanner userScoringId={userScoringId} />}
              {items.length > MISSION_ALERT_BANNER_POSITION && (
                <ul role="list" className={MISSIONS_LIST_CLASS_NAME}>
                  {items.slice(MISSION_ALERT_BANNER_POSITION).map((item, index) => renderMission(item, index + MISSION_ALERT_BANNER_POSITION))}
                </ul>
              )}
            </>
          )}

          <div className="fr-mt-3w pb-8">
            <Pagination page={page} totalPages={totalPages} disabled={pageLoading} ariaLabel="Pagination des résultats" onPageChange={onPageChange} />
          </div>
        </>
      )}
    </div>
  );
}

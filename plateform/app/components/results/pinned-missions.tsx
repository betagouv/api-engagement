import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import type { MatchResultItem } from "~/types/matching";
import { matchResultToBrowseMission } from "~/utils/mission";

const MissionMap = lazy(() => import("~/components/results/mission-map"));

interface PinnedMissionsProps {
  pinnedItems: MatchResultItem[];
  otherItems: MatchResultItem[];
  mapCenter: [number, number];
  loading: boolean;
  error: string | null;
  userScoringId: string | undefined;
  onResetAnswers: () => void;
  renderAction: (item: MatchResultItem) => ReactNode;
}

export default function PinnedMissions({ pinnedItems, otherItems, mapCenter, loading, error, userScoringId, onResetAnswers, renderAction }: PinnedMissionsProps) {
  return (
    <section className="flex flex-col md:flex-row">
      <div className="flex flex-col md:w-7/12">
        <div className="h-72 w-full md:hidden">
          <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
            {!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}
          </Suspense>
        </div>

        <div className="relative z-[1200] -mt-12 w-full rounded-t-[1.5rem] bg-white pt-7 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:rounded-none md:bg-transparent md:pt-0 md:shadow-none">
          <div className="flex items-center justify-between px-5 pb-2 md:px-6 md:pt-6">
            {!loading && !error && (
              <h1 className="fr-h3 mb-0!">
                <span className="text-highlighted">
                  {pinnedItems.length} mission{pinnedItems.length > 1 ? "s" : ""}
                </span>{" "}
                pour toi
              </h1>
            )}

            <Link to="/quiz/age" onClick={onResetAnswers} className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left shrink-0">
              Changer mes réponses
            </Link>
          </div>

          <div className="px-5 py-4 md:px-6">
            {loading && <p className="text-mention-grey text-sm">Chargement…</p>}

            {error && (
              <div className="fr-alert fr-alert--error">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && pinnedItems.length === 0 && otherItems.length === 0 && <p className="text-mention-grey text-sm">Aucune mission trouvée pour ce profil.</p>}
          </div>

          {!loading && !error && pinnedItems.length > 0 && (
            <>
              <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:gap-5 md:px-6">
                {pinnedItems.map((item) => (
                  <MissionCard
                    key={item.mission.id}
                    mission={matchResultToBrowseMission(item)}
                    link={{ type: "internal", to: userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}` }}
                    action={renderAction(item)}
                  />
                ))}
              </div>

              <div className="px-5 pb-8 md:px-6">
                <EmailMissionsModal userScoringId={userScoringId} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sticky top-0 hidden h-screen md:block md:w-5/12">
        <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
          {!loading && pinnedItems.length > 0 && <MissionMap items={pinnedItems} center={mapCenter} />}
        </Suspense>
      </div>
    </section>
  );
}

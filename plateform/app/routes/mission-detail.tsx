import { type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import SimilarMissions from "~/components/mission-detail/similar-missions";
import { fetchMissionDetail } from "~/services/mission-browse";
import type { MissionDetailResponse } from "~/types/mission-detail";
import { buildGoogleMapsUrl, formatCompensation, formatStartDate } from "~/utils/mission";

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] ${className}`}>{children}</div>;
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <i className={`${icon} mt-0.5 flex-none text-[1.35rem] text-[#000091]`} aria-hidden="true" />
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function MissionDetailPage() {
  const { missionId, userScoringId } = useParams<{ missionId: string; userScoringId?: string }>();
  const [mission, setMission] = useState<MissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    fetchMissionDetail(missionId)
      .then(setMission)
      .catch(() => setError("Impossible de charger cette mission."))
      .finally(() => setLoading(false));
  }, [missionId]);

  const backPath = userScoringId ? `/results/${userScoringId}` : "/";
  const backLabel = userScoringId ? "Retour aux résultats" : "Accueil";

  const durationLabel = mission ? formatStartDate(mission.startAt, mission.duration) : null;
  const compensationLabel = mission?.compensation ? formatCompensation(mission.compensation) : null;
  const locationDisplay = mission?.location?.address ?? mission?.location?.city ?? null;

  // ── CTA block ───────────────────────────────────────────────────────────
  const ctaBlock = mission && (
    <div className="flex flex-col gap-0 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {(durationLabel || mission.schedule) && (
        <InfoRow icon="fr-icon-time-line">
          {durationLabel && <span className="font-bold">{durationLabel}</span>}
          {mission.schedule && <span className="text-sm text-mention-grey">{mission.schedule}</span>}
        </InfoRow>
      )}

      {compensationLabel && (
        <>
          <hr className="border-[#DDD]" />
          <InfoRow icon="fr-icon-money-euro-circle-line">
            <span className="font-bold">{compensationLabel}</span>
          </InfoRow>
        </>
      )}

      <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn mt-4! w-full! justify-center!">
        Découvrir la mission
      </a>

      <button type="button" className="fr-btn fr-btn--secondary fr-icon-mail-line fr-btn--icon-left mt-3! w-full! justify-center!">
        Recevoir cette mission par e-mail
      </button>
    </div>
  );

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen fr-background-alt--grey px-5 py-10 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
          {backLabel}
        </Link>
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen fr-background-alt--grey px-5 py-10 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left mb-8">
          {backLabel}
        </Link>
        <div className="fr-alert fr-alert--error">
          <p>{error ?? "Mission introuvable."}</p>
        </div>
      </div>
    );
  }

  const publisherTypeLabel = mission.type ? `Mission ${mission.type} proposée par` : "Mission proposée par";
  const orgDisplayName = mission.organizationName ?? mission.publisherName;

  return (
    <div className="min-h-screen fr-background-alt--grey">
      {/* Back link */}
      <div className="bg-white px-5 py-4 md:px-6">
        <Link to={backPath} className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left">
          {backLabel}
        </Link>
      </div>

      {/* Mobile hero image */}
      {mission.photo && (
        <div className="h-[216px] w-full overflow-hidden md:hidden">
          <img src={mission.photo} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col md:flex-row md:items-start">
        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-4 p-5 md:gap-5 md:p-8 md:pr-10">
          {/* Block 1 — Tags + Titre + Organisation */}
          <Card className="p-6">
            {mission.domain && (
              <div className="fr-mb-3w flex flex-wrap gap-2">
                <p className="fr-tag fr-tag--sm">{mission.domain}</p>
              </div>
            )}

            <h1 className="mb-5 text-[1.5rem] font-bold leading-snug text-title-grey md:text-[2.5rem]">{mission.title}</h1>

            {orgDisplayName && (
              <div className="flex items-center gap-3">
                {(mission.organizationLogo ?? mission.publisherLogo) && (
                  <img src={(mission.organizationLogo ?? mission.publisherLogo)!} alt="" className="h-10 w-10 flex-none rounded object-contain" loading="eager" />
                )}
                <p className="text-sm text-mention-grey">
                  {publisherTypeLabel} <span className="font-semibold text-title-grey">{orgDisplayName}</span>
                </p>
              </div>
            )}
          </Card>

          {/* Block 2 — Localisation */}
          {locationDisplay && (
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <i className="fr-icon-map-pin-2-line mt-0.5 flex-none text-[1.5rem] text-[#000091]" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  {mission.location?.city && <span className="font-bold text-title-grey">{mission.location.city}</span>}
                  {mission.location?.address && <span className="text-sm text-mention-grey">{mission.location.address}</span>}
                  <a
                    href={buildGoogleMapsUrl(locationDisplay)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fr-btn fr-btn--secondary fr-btn--sm fr-icon-external-link-line fr-btn--icon-right mt-1 w-fit!"
                  >
                    Ouvrir sur Google Maps
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Mobile CTA blocks */}
          <div className="flex flex-col gap-3 md:hidden">
            {(durationLabel || mission.schedule) && (
              <Card className="p-5">
                <InfoRow icon="fr-icon-time-line">
                  {durationLabel && <span className="font-bold">{durationLabel}</span>}
                  {mission.schedule && <span className="text-sm text-mention-grey">{mission.schedule}</span>}
                </InfoRow>
              </Card>
            )}
            {compensationLabel && (
              <Card className="p-5">
                <InfoRow icon="fr-icon-money-euro-circle-line">
                  <span className="font-bold">{compensationLabel}</span>
                </InfoRow>
              </Card>
            )}
            <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
              Découvrir la mission
            </a>
            <button type="button" className="fr-btn fr-btn--secondary fr-icon-mail-line fr-btn--icon-left w-full! justify-center!">
              Recevoir cette mission par e-mail
            </button>
          </div>

          {/* Block 3 — Présentation de la mission */}
          {(mission.descriptionHtml || mission.description) && (
            <Card className="p-6">
              <h2 className="mb-5 text-xl font-bold text-title-grey md:text-2xl">Présentation de la mission</h2>
              {mission.descriptionHtml ? (
                <div className="mission-description prose max-w-none text-title-grey" dangerouslySetInnerHTML={{ __html: mission.descriptionHtml }} />
              ) : (
                <p className="whitespace-pre-line text-title-grey">{mission.description}</p>
              )}
            </Card>
          )}
        </div>

        {/* ── Right column (desktop only) ─────────────────────────────── */}
        <div className="hidden w-[400px] flex-none p-8 pl-0 md:block">
          {mission.photo && (
            <div className="mb-4 h-[216px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <img src={mission.photo} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="sticky top-4">{ctaBlock}</div>
        </div>
      </div>

      {/* Similar missions */}
      {userScoringId && <SimilarMissions userScoringId={userScoringId} currentMissionId={mission.id} />}

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[#DDD] bg-white px-5 py-4 md:hidden">
        <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
          Postuler
        </a>
      </div>
    </div>
  );
}

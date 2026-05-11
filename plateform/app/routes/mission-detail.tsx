import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import SimilarMissions from "~/components/mission-detail/SimilarMissions";
import { fetchMissionDetail } from "~/services/mission-browse";
import type { MissionDetailCompensation, MissionDetailResponse } from "~/types/mission-detail";

// ── Formatting helpers ──────────────────────────────────────────────────────

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function formatStartDate(startAt: string | null, duration: number | null): string | null {
  if (!startAt && !duration) return null;
  const parts: string[] = [];
  if (duration != null) parts.push(`${duration} mois`);
  if (startAt) {
    const d = new Date(startAt);
    parts.push(`à partir du ${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }
  return parts.join(" ") || null;
}

function formatCompensation(compensation: MissionDetailCompensation): string | null {
  if (compensation.amount == null) return null;
  const amount = compensation.amountMax ? `${compensation.amount} – ${compensation.amountMax}` : `${compensation.amount}`;
  const unit = compensation.unit ? ` € par ${compensation.unit}` : " €";
  return `${amount}${unit}`;
}

function formatDeadline(endAt: string | null): string | null {
  if (!endAt) return null;
  const d = new Date(endAt);
  return `Candidatures ouvertes jusqu'au ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TagBadge({ label }: { label: string }) {
  return <span className="inline-block rounded-sm bg-[#E3E3FD] px-3 py-1 text-sm font-medium text-[#000091]">{label}</span>;
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
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
  const deadlineLabel = mission ? formatDeadline(mission.endAt) : null;
  const locationDisplay = mission?.location?.address ?? mission?.location?.city ?? null;

  // ── CTA block (shared desktop/mobile) ───────────────────────────────────
  const ctaBlock = mission && (
    <div className="flex flex-col gap-4 bg-white p-6 shadow-sm">
      {(durationLabel || mission.schedule) && (
        <InfoRow icon="fr-icon-time-line">
          {durationLabel && <span className="font-bold">{durationLabel}</span>}
          {mission.schedule && <span className="text-sm text-[#666]">{mission.schedule}</span>}
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

      {deadlineLabel && (
        <>
          <hr className="border-[#DDD]" />
          <InfoRow icon="fr-icon-calendar-line">
            <span className="font-bold">{deadlineLabel}</span>
            <span className="text-xs text-[#666]">Les candidatures peuvent fermer plus tôt si la mission est pourvue</span>
          </InfoRow>
        </>
      )}

      <a
        href={mission.applicationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block bg-[#000091] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1212ff]"
      >
        Découvrir la mission
      </a>

      <button type="button" className="block w-full border border-[#000091] px-4 py-3 text-base font-semibold text-[#000091] hover:bg-[#f5f5ff]">
        <i className="fr-icon-mail-line fr-icon--sm mr-2" aria-hidden="true" />
        Recevoir cette mission par e-mail
      </button>
    </div>
  );

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white px-5 py-10 md:px-6">
        <Link to={backPath} className="mb-8 inline-flex items-center gap-1 text-sm text-[#000091] hover:underline">
          <i className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          {backLabel}
        </Link>
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-white px-5 py-10 md:px-6">
        <Link to={backPath} className="mb-8 inline-flex items-center gap-1 text-sm text-[#000091] hover:underline">
          <i className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
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
    <div className="min-h-screen bg-white">
      {/* Back link */}
      <div className="px-5 py-4 md:px-6">
        <Link to={backPath} className="inline-flex items-center gap-1 text-sm text-[#000091] hover:underline">
          <i className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
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
        <div className="flex-1 px-5 py-6 md:px-8 md:py-8 md:pr-12">
          {/* Domain tags */}
          {mission.domain && (
            <div className="mb-4 flex flex-wrap gap-2">
              <TagBadge label={mission.domain} />
            </div>
          )}

          {/* Title */}
          <h1 className="mb-4 text-[1.5rem] font-bold leading-snug text-[#161616] md:text-[2.5rem]">{mission.title}</h1>

          {/* Publisher / org */}
          {orgDisplayName && (
            <div className="mb-6 flex items-center gap-3">
              {(mission.organizationLogo ?? mission.publisherLogo) && (
                <img src={(mission.organizationLogo ?? mission.publisherLogo)!} alt="" className="h-10 w-10 flex-none rounded object-contain" loading="eager" />
              )}
              <p className="text-sm text-[#666]">
                {publisherTypeLabel} <span className="font-semibold text-[#161616]">{orgDisplayName}</span>
              </p>
            </div>
          )}

          {/* Location */}
          {locationDisplay && (
            <div className="mb-6 border border-[#DDD] p-4">
              <div className="flex items-start gap-3">
                <i className="fr-icon-map-pin-2-line mt-0.5 flex-none text-[1.35rem] text-[#000091]" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  {mission.location?.city && <span className="font-bold">{mission.location.city}</span>}
                  {mission.location?.address && <span className="text-sm text-[#666]">{mission.location.address}</span>}
                  <a
                    href={buildGoogleMapsUrl(locationDisplay)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 border border-[#DDD] px-3 py-1.5 text-sm text-[#000091] hover:bg-[#f5f5ff]"
                  >
                    <i className="fr-icon-external-link-line fr-icon--sm" aria-hidden="true" />
                    Ouvrir sur Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Mobile CTA blocks */}
          <div className="mb-6 space-y-3 md:hidden">
            {(durationLabel || mission.schedule) && (
              <div className="border border-[#DDD] p-4">
                <InfoRow icon="fr-icon-time-line">
                  {durationLabel && <span className="font-bold">{durationLabel}</span>}
                  {mission.schedule && <span className="text-sm text-[#666]">{mission.schedule}</span>}
                </InfoRow>
              </div>
            )}
            {compensationLabel && (
              <div className="border border-[#DDD] p-4">
                <InfoRow icon="fr-icon-money-euro-circle-line">
                  <span className="font-bold">{compensationLabel}</span>
                </InfoRow>
              </div>
            )}
            {deadlineLabel && <div className="mb-4 text-sm text-[#666]">{deadlineLabel}</div>}
            <a
              href={mission.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#000091] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1212ff]"
            >
              Découvrir la mission
            </a>
            <button type="button" className="block w-full border border-[#000091] px-4 py-3 text-base font-semibold text-[#000091] hover:bg-[#f5f5ff]">
              <i className="fr-icon-mail-line fr-icon--sm mr-2" aria-hidden="true" />
              Recevoir cette mission par e-mail
            </button>
          </div>

          {/* Description */}
          {(mission.descriptionHtml || mission.description) && (
            <section className="mt-2">
              <h2 className="mb-4 text-xl font-bold text-[#161616] md:text-2xl">Présentation de la mission</h2>
              {mission.descriptionHtml ? (
                <div className="mission-description prose max-w-none text-[#161616]" dangerouslySetInnerHTML={{ __html: mission.descriptionHtml }} />
              ) : (
                <p className="whitespace-pre-line text-[#161616]">{mission.description}</p>
              )}
            </section>
          )}
        </div>

        {/* ── Right column (desktop only) ─────────────────────────────── */}
        <div className="hidden w-[400px] flex-none md:block">
          {mission.photo && (
            <div className="h-[216px] overflow-hidden">
              <img src={mission.photo} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="sticky top-0">{ctaBlock}</div>
        </div>
      </div>

      {/* Similar missions */}
      {userScoringId && <SimilarMissions userScoringId={userScoringId} currentMissionId={mission.id} city={mission.location?.city} />}

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[#DDD] bg-white px-5 py-4 md:hidden">
        {deadlineLabel && <p className="mb-2 text-xs text-[#666]">{deadlineLabel}</p>}
        <a
          href={mission.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-[#000091] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1212ff]"
        >
          Postuler
        </a>
      </div>
    </div>
  );
}

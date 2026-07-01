import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { Link } from "react-router";

import { formatCompensation } from "~/utils/mission";

// `state` est transmis à la navigation interne (React Router) — utilisé pour l'entry_source de
// `mission_detail.viewed` (provenance + rang de la carte).
type MissionCardLink = { type: "internal"; to: string; state?: unknown } | { type: "external"; href: string };

interface MissionCardProps {
  mission: MissionBrowse;
  link?: MissionCardLink;
  // Déclenché quand l'utilisateur ouvre la mission via le lien de la carte (DSFR `fr-enlarge-link`
  // étend la zone cliquable à toute la carte). Sert notamment au tracking `mission.clicked`.
  onClick?: () => void;
}

export default function MissionCard({ mission, link, onClick }: MissionCardProps) {
  const domainLabel = getDomainLabel(mission.domain);
  const cardImage = mission.photo ?? mission.organizationLogo ?? mission.domainLogo;
  const compensationLabel = mission.compensation ? formatCompensation(mission.compensation) : null;

  const clampStyle = { display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 3, overflow: "hidden" };

  const title =
    link?.type === "internal" ? (
      <Link to={link.to} state={link.state} onClick={onClick} className="text-title-grey! fr-h6! bg-none! mb-0!" style={clampStyle}>
        {mission.title}
      </Link>
    ) : link?.type === "external" ? (
      <a href={link.href} onClick={onClick} target="_blank" rel="noopener noreferrer" className="text-title-grey! fr-h6! bg-none! mb-0!" style={clampStyle}>
        {mission.title}
      </a>
    ) : (
      <span className="text-title-grey! fr-h6! mb-0!" style={clampStyle}>
        {mission.title}
      </span>
    );

  return (
    <div className="mission-card fr-card fr-card--no-icon fr-enlarge-link relative h-full w-full md:max-w-[330px]">
      {compensationLabel && <p className="fr-badge fr-badge--sm fr-badge--purple-glycine absolute top-3 left-3 z-1 m-0!">{compensationLabel}</p>}

      <div className="fr-card__body px-6! py-4!">
        <div className="fr-card__content m-0! p-0!">
          {domainLabel && (
            <div className="fr-card__start mb-3! leading-none!">
              <p className="fr-tag fr-tag--sm m-0!">{domainLabel}</p>
            </div>
          )}

          <h3 className="fr-card__title mb-0! leading-tight!">{title}</h3>

          <div className="fr-card__end flex flex-col gap-2 justify-between mt-3! p-0!">
            <div className="flex flex-col gap-1">
              {mission.city && <p className="fr-card__detail fr-icon-map-pin-2-line m-0! block! truncate!">{mission.city}</p>}
              {mission.schedule && <p className="fr-card__detail fr-icon-time-line m-0! block! truncate!">{mission.schedule}</p>}
              {mission.organizationName && <p className="fr-card__detail fr-icon-building-line m-0! block! truncate!">{mission.organizationName}</p>}
            </div>

            {(mission.publisherName ?? mission.publisherLogo) && (
              <div className="text-mention-grey fr-mt-2w flex items-center justify-end gap-2 text-xs">
                {mission.publisherName && <span className="line-clamp-1">{mission.publisherName}</span>}
                {mission.publisherLogo && <img src={mission.publisherLogo} alt="" className="max-w-20 object-contain" loading="lazy" />}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fr-card__header">
        <div className="fr-card__img">
          {cardImage ? <img className="fr-responsive-img" src={cardImage} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet aspect-video w-full" />}
        </div>
      </div>
    </div>
  );
}

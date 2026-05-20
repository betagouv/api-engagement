import type { MissionBrowse } from "@engagement/dto";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { DOMAIN_LABELS } from "~/utils/domains";

type MissionCardLink = { type: "internal"; to: string } | { type: "external"; href: string };

interface MissionCardProps {
  mission: MissionBrowse;
  link?: MissionCardLink;
  action?: ReactNode;
}

export default function MissionCard({ mission, link, action }: MissionCardProps) {
  const domainLabel = mission.domain ? (DOMAIN_LABELS[mission.domain] ?? mission.domain) : null;
  const cardImage = mission.photo ?? mission.organizationLogo ?? mission.domainLogo;

  const title =
    link?.type === "internal" ? (
      <Link to={link.to} className="text-title-grey! fr-h6! bg-none!">
        {mission.title}
      </Link>
    ) : link?.type === "external" ? (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-title-grey! fr-h6! bg-none!">
        {mission.title}
      </a>
    ) : (
      <span className="text-title-grey! fr-h6!">{mission.title}</span>
    );

  return (
    <div className="mission-card fr-card fr-card--no-icon fr-enlarge-link relative h-full w-full md:max-w-[330px]">
      <div className="fr-card__body">
        <div className="fr-card__content">
          {domainLabel && (
            <div className="fr-card__start mb-3!">
              <p className="fr-tag fr-tag--sm">{domainLabel}</p>
            </div>
          )}

          <h3 className="fr-card__title">{title}</h3>

          <div className="fr-card__end flex flex-col gap-2">
            {mission.city && <p className="fr-card__detail fr-icon-map-pin-2-line">{mission.city}</p>}
            {mission.schedule && <p className="fr-card__detail fr-icon-time-line">{mission.schedule}</p>}
            {mission.organizationName && <p className="fr-card__detail fr-icon-building-line">{mission.organizationName}</p>}

            {(mission.publisherName ?? mission.publisherLogo) && (
              <div className="text-mention-grey fr-mt-2w flex items-center justify-end gap-2 text-xs">
                {mission.publisherName && <span className="line-clamp-1">{mission.publisherName}</span>}
                {mission.publisherLogo && <img src={mission.publisherLogo} alt="" className="max-h-6 max-w-16 object-contain" loading="lazy" />}
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

      {action}
    </div>
  );
}

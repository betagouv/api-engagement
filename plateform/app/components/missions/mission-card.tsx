<<<<<<< HEAD
import type { ReactNode } from "react";
import { Link } from "react-router";

=======
>>>>>>> feature/plateforme-engagement
import { TAXONOMY } from "@engagement/taxonomy";
import type { BrowseMission } from "~/services/mission-browse";

interface MissionCardProps {
  mission: BrowseMission;
<<<<<<< HEAD
  to?: string;
  debugButton?: ReactNode;
}

export default function MissionCard({ mission, to, debugButton }: MissionCardProps) {
  const domainLabel = mission.domain ? ((TAXONOMY.domaine.values as Record<string, { label: string }>)[mission.domain]?.label ?? mission.domain) : null;
  const cardImage = mission.photo ?? mission.organizationLogo ?? mission.domainLogo;

  const card = (
    <div className="fr-card relative h-full w-full md:max-w-[330px]">
=======
}

export default function MissionCard({ mission }: MissionCardProps) {
  const domainLabel = mission.domain ? ((TAXONOMY.domaine.values as Record<string, { label: string }>)[mission.domain]?.label ?? mission.domain) : null;

  return (
    <div className="fr-card fr-enlarge-link h-full w-full md:max-w-[330px]">
>>>>>>> feature/plateforme-engagement
      <div className="fr-card__body">
        <div className="fr-card__content">
          {domainLabel && (
            <div className="fr-card__start mb-3!">
              <p className="fr-tag fr-tag--sm">{domainLabel}</p>
            </div>
          )}

          <h3 className="fr-card__title">
<<<<<<< HEAD
            <span className="text-title-grey! fr-h6!">{mission.title}</span>
=======
            <a href={mission.applicationUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="text-title-grey! fr-h6! bg-none!">
              {mission.title}
            </a>
>>>>>>> feature/plateforme-engagement
          </h3>

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
<<<<<<< HEAD
          {cardImage ? <img className="fr-responsive-img" src={cardImage} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet aspect-video w-full" />}
        </div>
      </div>

      {debugButton}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block bg-none">
        {card}
      </Link>
    );
  }

  return (
    <a href={mission.applicationUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="block bg-none">
      {card}
    </a>
  );
=======
          {mission.domainLogo ? <img className="fr-responsive-img" src={mission.domainLogo} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet aspect-video w-full" />}
        </div>
      </div>
    </div>
  );
>>>>>>> feature/plateforme-engagement
}

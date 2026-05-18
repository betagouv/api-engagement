import type { MissionDetailResponse } from "@engagement/dto";
import { formatMissionType } from "~/utils/mission";

interface MissionHeroCardProps {
  mission: MissionDetailResponse;
}

export default function MissionHeroCard({ mission }: MissionHeroCardProps) {
  const publisherTypeLabel = formatMissionType(mission.type);
  const orgDisplayName = mission.organizationName ?? mission.publisherName;
  const logo = mission.organizationLogo ?? mission.publisherLogo;

  return (
    <section className="fr-card fr-card--no-arrow">
      <div className="fr-card__body">
        <div className="fr-card__content flex! flex-col!">
          {mission.domain && (
            <div className="fr-mb-3w order-1">
              <p className="fr-tag fr-tag--sm">{mission.domain}</p>
            </div>
          )}

          <h1 className="fr-h1 fr-mb-3w order-2">{mission.title}</h1>

          {orgDisplayName && (
            <div className="order-3 flex items-center gap-3">
              {logo && <img src={logo} alt="" className="h-10 w-10 flex-none object-contain" loading="eager" />}
              <p className="fr-text--sm fr-mb-0 text-mention-grey">
                {publisherTypeLabel} proposée par <span className="font-semibold text-title-grey">{orgDisplayName}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

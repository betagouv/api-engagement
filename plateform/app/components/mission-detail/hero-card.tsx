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
    <section className="fr-card fr-card--no-arrow shadow-[0_4px_12px_rgba(0,0,18,0.16)]">
      <div className="fr-card__body">
        <div className="fr-card__content flex! flex-col! gap-4 p-6! md:p-12!">
          {mission.domain && (
            <div className="order-1">
              <p className="fr-tag fr-tag--sm">{mission.domain}</p>
            </div>
          )}

          <h1 className="fr-h1 mb-0! order-2">{mission.title}</h1>

          {orgDisplayName && (
            <div className="order-3 flex items-center gap-4">
              {logo && <img src={logo} alt="" className="h-8 w-14 flex-none object-contain" loading="eager" />}
              <p className="fr-text--sm fr-mb-0 text-mention-grey">
                {publisherTypeLabel} proposée par <span className="text-title-grey font-semibold">{orgDisplayName}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

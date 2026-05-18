import type { MissionDetailResponse } from "@engagement/dto";

interface MissionDescriptionCardProps {
  mission: MissionDetailResponse;
}

export default function MissionDescriptionCard({ mission }: MissionDescriptionCardProps) {
  if (!mission.descriptionHtml && !mission.description) return null;

  return (
    <section className="fr-card fr-card--no-arrow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h2 className="fr-card__title fr-h4">Présentation de la mission</h2>
          {mission.descriptionHtml ? (
            <div className="mission-description prose max-w-none text-title-grey" dangerouslySetInnerHTML={{ __html: mission.descriptionHtml }} />
          ) : (
            <p className="whitespace-pre-line text-title-grey">{mission.description}</p>
          )}
        </div>
      </div>
    </section>
  );
}

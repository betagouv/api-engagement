import type { MissionDetailResponse } from "@engagement/dto";

interface MissionDescriptionCardProps {
  mission: MissionDetailResponse;
}

export default function MissionDescriptionCard({ mission }: MissionDescriptionCardProps) {
  if (!mission.descriptionHtml && !mission.description) return null;

  return (
    <section className="fr-card fr-card--no-arrow shadow-card bg-none! p-0!">
      <div className="fr-card__body">
        <div className="fr-card__content p-6! md:p-12!">
          <h2 className="fr-h3 mb-4!">Présentation de la mission</h2>
          {mission.descriptionHtml ? (
            <div className="mission-description prose text-title-grey max-w-none" dangerouslySetInnerHTML={{ __html: mission.descriptionHtml }} />
          ) : (
            <p className="text-title-grey whitespace-pre-line">{mission.description}</p>
          )}
        </div>
      </div>
    </section>
  );
}

import type { MissionDetailResponse } from "@engagement/dto";

interface MissionDescriptionCardProps {
  mission: MissionDetailResponse;
}

export default function MissionDescriptionCard({ mission }: MissionDescriptionCardProps) {
  if (!mission.descriptionHtml && !mission.description) return null;

  return (
    <section className="md:shadow-card bg-background md:bg-white! p-0! mt-6! md:mt-0!">
      <div className="fr-card__body">
        <div className="fr-card__content px-5! py-5! md:p-12!">
          <h2 className="fr-h1 mb-4!">Présentation de la mission</h2>
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

import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { type ReactNode, useState } from "react";
import { Link } from "react-router";

import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import Carousel from "~/components/ui/carousel";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { LandingCta, LandingName, MissionDetailNavState } from "~/services/tracking/types";
import { buildMissionBrowseTags } from "~/utils/mission";

// Carrousel de missions (issues du loader de la landing) dans un bandeau coloré. `landing` nomme la page
// pour le tracking, `backTo` est son chemin, pour revenir à la landing depuis la fiche mission.
export default function Missions({
  missions,
  cta,
  title,
  description,
  landing,
  backTo,
  className = "bg-beige-gris-galet-975",
}: {
  missions: MissionBrowse[];
  cta: LandingCta;
  title: ReactNode;
  description: string;
  landing: LandingName;
  backTo: string;
  className?: string;
}) {
  const [emailMissionId, setEmailMissionId] = useState<string | null>(null);

  if (!missions.length) return null;

  return (
    // `overflow-x-clip` : le carrousel dépasse jusqu'au bord de l'écran, sans créer de scroll horizontal.
    <section className="overflow-x-clip">
      <div className="fr-container">
        {/* Le bandeau est pleine largeur sur mobile, puis contenu à partir de la tablette (cf. maquette). */}
        <div className={`@container mx-[calc(50%-50vw)] px-4 py-6 md:mx-0 md:px-6 lg:px-24 md:py-14! ${className}`}>
          <h2 className="fr-h1 mb-4!">{title}</h2>
          <p className="fr-text--lead mb-4! md:mb-6! lg:mb-8!">{description}</p>

          <Carousel
            squareArrows
            label="Missions mises en avant"
            previousLabel="Voir les missions précédentes"
            nextLabel="Voir les missions suivantes"
            // Débord jusqu'aux bords de l'écran des deux côtés : la marge négative (50vw - 50cqw, soit l'écart entre
            // le bandeau et le bord de l'écran) est compensée par un padding identique, donc les cartes restent
            // alignées sur le titre. `cqw` (le bandeau est un conteneur) plutôt que `%`, que `scroll-padding`
            // calculerait sur la liste elle-même.
            listClassName="ml-[calc(50cqw-50vw)]! mr-[calc(50cqw-50vw)]! pl-[calc(50vw-50cqw)]! pr-[calc(50vw-50cqw)]! scroll-pl-[calc(50vw-50cqw)]!"
            itemClassName="w-[85vw] max-w-[384px] md:w-[384px]"
            action={
              <Link to={cta.to} onClick={cta.onClick} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:w-auto!">
                {cta.label}
              </Link>
            }
          >
            {missions.map((mission, index) => (
              <MissionCard
                key={mission.id}
                image={mission.photo ?? mission.organizationLogo ?? mission.domainLogo}
                domainLabel={getDomainLabel(mission.domain)}
                title={mission.title}
                to={`/missions/${mission.id}`}
                state={{ entrySource: landing, backTo } satisfies MissionDetailNavState}
                onClick={() => trackMissionClickedFromBrowse(mission, { section: landing, entryPage: landing, opensExternal: false, rank: index + 1 })}
                tags={buildMissionBrowseTags(mission)}
                publisherName={mission.publisherName}
                publisherLogo={mission.publisherLogo}
                onEmailClick={() => setEmailMissionId(mission.id)}
              />
            ))}
          </Carousel>

          {/* Pas de `userScoringId` : le visiteur n'a pas fait le quiz, l'envoi porte sur la seule mission choisie. */}
          <EmailMissionsModal
            userScoringId={undefined}
            entryPage={landing}
            missionId={emailMissionId ?? undefined}
            open={emailMissionId !== null}
            onOpenChange={(open) => !open && setEmailMissionId(null)}
          />
        </div>
      </div>
    </section>
  );
}

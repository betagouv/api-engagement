import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { useState } from "react";
import { Link } from "react-router";

import MissionCard from "~/components/missions/mission-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import Carousel from "~/components/ui/carousel";
import Highlight from "~/components/ui/highlight";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { LandingCta, MissionDetailNavState } from "~/services/tracking/types";
import { buildMissionBrowseTags } from "~/utils/mission";

export default function Missions({ missions, cta }: { missions: MissionBrowse[]; cta: LandingCta }) {
  const [emailMissionId, setEmailMissionId] = useState<string | null>(null);

  if (!missions.length) return null;

  return (
    // `overflow-x-clip` : le carrousel dépasse jusqu'au bord de l'écran, sans créer de scroll horizontal.
    <section className="overflow-x-clip">
      <div className="fr-container">
        {/* Le bandeau beige est pleine largeur sur mobile, puis contenu à partir de la tablette (cf. maquette). */}
        <div className="bg-beige-gris-galet-975 mx-[calc(50%-50vw)] px-4 py-6 md:mx-0 md:px-6 lg:px-24 md:py-14!">
          <h2 className="fr-h1 mb-4!">
            Des missions à <Highlight className="bg-[#9ef9be] dark:bg-transparent">ne pas louper</Highlight> !
          </h2>
          <p className="fr-text--lead mb-4! md:mb-6! lg:mb-8!">
            Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre les missions qui te
            correspondent !
          </p>

          <Carousel
            label="Missions à ne pas louper"
            previousLabel="Voir les missions précédentes"
            nextLabel="Voir les missions suivantes"
            // Débord des deux côtés : à gauche la marge négative (compensée par le padding, donc les cartes
            // restent alignées sur le titre) laisse la carte sortante glisser hors du bandeau ; à droite le
            // carrousel va jusqu'au bord de l'écran.
            listClassName="-ml-32! scroll-pl-32! pl-32! md:mr-[calc(50%-50vw)]!"
            itemClassName="w-[80vw] max-w-[305px] md:w-[305px]"
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
                state={{ entrySource: "landing_defis_engagement", backTo: "/defis-engagement" } satisfies MissionDetailNavState}
                onClick={() =>
                  trackMissionClickedFromBrowse(mission, { section: "landing_defis_engagement", entryPage: "landing_defis_engagement", opensExternal: false, rank: index + 1 })
                }
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
            entryPage="landing_defis_engagement"
            missionId={emailMissionId ?? undefined}
            open={emailMissionId !== null}
            onOpenChange={(open) => !open && setEmailMissionId(null)}
            hideTrigger
          />
        </div>
      </div>
    </section>
  );
}

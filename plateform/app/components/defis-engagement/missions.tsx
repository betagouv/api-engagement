import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { useState } from "react";

import MissionResultCard from "~/components/missions/mission-result-card";
import EmailMissionsModal from "~/components/results/email-missions-modal";
import Carousel from "~/components/ui/carousel";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { MissionDetailNavState } from "~/services/tracking/types";
import { formatCompensation } from "~/utils/mission";

// Tags bleus de la carte (cf. maquette : lieu, rythme, indemnité) construits depuis les champs browse.
// Le matching n'a pas tourné ici : pas de tags de scoring comme sur la page de résultats.
const buildTags = (mission: MissionBrowse): string[] => {
  const location = mission.remote === "local" ? "Près de chez moi" : mission.remote === "full" ? "À distance" : mission.city;
  const compensation = mission.compensation ? formatCompensation(mission.compensation) : null;
  return [location, mission.schedule, compensation].filter((tag): tag is string => Boolean(tag));
};

export default function Missions({ missions, onStartQuiz }: { missions: MissionBrowse[]; onStartQuiz: () => void }) {
  const [emailMissionId, setEmailMissionId] = useState<string | null>(null);

  if (!missions.length) return null;

  return (
    // `overflow-x-clip` : le carrousel dépasse jusqu'au bord de l'écran, sans créer de scroll horizontal.
    <section className="mb-6! overflow-x-clip md:mb-8">
      <div className="fr-container">
        {/* Le bandeau beige est pleine largeur sur mobile, puis contenu à partir de la tablette (cf. maquette). */}
        <div className="bg-yellow-moutarde-975 mx-[calc(50%-50vw)] px-4 py-6 md:mx-0 md:p-8 lg:px-16 lg:py-12">
          <h2 className="fr-h1 mb-4!">Des missions à ne pas louper !</h2>
          <p className="fr-text--lead fr-mb-6w">
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
              <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:w-auto!">
                Trouve ta mission
              </button>
            }
          >
            {missions.map((mission) => (
              <MissionResultCard
                key={mission.id}
                image={mission.photo ?? mission.organizationLogo ?? mission.domainLogo}
                domainLabel={getDomainLabel(mission.domain)}
                title={mission.title}
                to={`/missions/${mission.id}`}
                state={{ entrySource: "defis_engagement" } satisfies MissionDetailNavState}
                onClick={() => trackMissionClickedFromBrowse(mission, { section: "defis_engagement", entryPage: "defis_engagement", opensExternal: false })}
                tags={buildTags(mission)}
                publisherName={mission.publisherName}
                publisherLogo={mission.publisherLogo}
                onEmailClick={() => setEmailMissionId(mission.id)}
              />
            ))}
          </Carousel>

          {/* Pas de `userScoringId` : le visiteur n'a pas fait le quiz, l'envoi porte sur la seule mission choisie. */}
          <EmailMissionsModal
            userScoringId={undefined}
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

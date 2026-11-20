import type { MissionBrowse } from "@engagement/dto";

import MissionCard from "~/components/missions/mission-card";
import Carousel from "~/components/ui/carousel";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { MissionDetailNavState } from "~/services/tracking/types";
import { buildMissionBrowseHref } from "~/utils/mission";

// Carrousel d'exemples de la home : une mission de l'API par dispositif (cf. loader de `_index.tsx`),
// avec un lien vers sa fiche sur la plateforme (pas de sortie externe).
export default function MissionExamples({ missions }: { missions: MissionBrowse[] }) {
  if (!missions.length) return null;

  return (
    <section className="relative z-10 pt-4 md:pt-8" aria-label="Exemples de missions d'engagement">
      {/* RGAA 9.1 : titre de section masqué — les titres de cartes sont des <h3>, sans saut depuis le h1 du hero. */}
      <h2 className="fr-sr-only">Exemples de missions d'engagement</h2>
      <div className="fr-container">
        <Carousel
          label="Exemples de missions d'engagement"
          previousLabel="Voir les missions précédentes"
          nextLabel="Voir les missions suivantes"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]! md:gap-4!"
          itemClassName="w-[80vw] max-w-84 md:w-84"
        >
          {missions.map((mission, index) => (
            <MissionCard
              key={mission.id}
              image={mission.photo ?? mission.organizationLogo ?? mission.domainLogo}
              domainLabel={null}
              title={mission.title}
              to={buildMissionBrowseHref(mission)}
              state={{ entrySource: "homepage", rank: index + 1, backTo: "/" } satisfies MissionDetailNavState}
              onClick={() => trackMissionClickedFromBrowse(mission, { section: "homepage_examples", entryPage: "homepage", opensExternal: false, rank: index + 1 })}
              publisherName={mission.publisherName}
              publisherLogo={mission.publisherLogo}
            />
          ))}
        </Carousel>
      </div>
    </section>
  );
}

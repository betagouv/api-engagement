import type { MissionBrowse } from "@engagement/dto";
import { Link } from "react-router";

import Carousel from "~/components/ui/carousel";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";

type Props = {
  missions: MissionBrowse[];
  className?: string;
};

const CARD_CLASS = "bg-background border-border-default-grey flex h-full w-full overflow-hidden border shadow-lg";

export default function MissionExamples({ missions, className }: Props) {
  if (!missions?.length) return null;

  return (
    <section className={`fr-pb-4w relative z-10 ${className}`}>
      {/* RGAA 9.1 : titre de section masqué — les titres de cartes sont des <h3>, sans saut depuis le h1 du hero. */}
      <h2 className="fr-sr-only">Exemples de missions d'engagement</h2>
      <div className="fr-container">
        <Carousel
          label="Exemples de missions d'engagement"
          previousLabel="Voir les missions précédentes"
          nextLabel="Voir les missions suivantes"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]!"
          itemClassName="w-[80vw] max-w-[360px] md:w-[360px]"
        >
          {missions.map((mission) => {
            const content = (
              <>
                {mission.domainLogo ? (
                  <img src={mission.domainLogo} alt="" className="w-28 shrink-0 object-cover" loading="lazy" />
                ) : (
                  <div className="bg-beige-gris-galet w-28 shrink-0" />
                )}
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <h3 className="fr-h6 line-clamp-2 mb-0!">{mission.title}</h3>
                  <div className="fr-mt-auto flex items-center gap-2">
                    {/* RGAA 1.1 : sans nom d'annonceur, on n'affiche pas le logo. */}
                    {mission.publisherName && (
                      <>
                        {mission.publisherLogo && (
                          <div className="size-10 rounded bg-white">
                            <img src={mission.publisherLogo} aria-hidden="true" alt="" className="size-full object-contain" />
                          </div>
                        )}
                        <span className="fr-text--xs text-mention-grey line-clamp-1 mb-0!">{mission.publisherName}</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            );

            return mission.applicationUrl ? (
              <Link
                key={mission.id}
                to={mission.applicationUrl}
                onClick={() => trackMissionClickedFromBrowse(mission, { section: "homepage_examples", entryPage: "homepage", opensExternal: true })}
                className={`${CARD_CLASS} no-underline! bg-none! hover:bg-background!`}
              >
                {content}
              </Link>
            ) : (
              <div key={mission.id} className={CARD_CLASS}>
                {content}
              </div>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}

import MissionAscWebp from "~/assets/images/home/mission-asc.webp";
import MissionGendarmerieWebp from "~/assets/images/home/mission-gendarmerie.webp";
import MissionJvaWebp from "~/assets/images/home/mission-jva.webp";
import MissionPoliceWebp from "~/assets/images/home/mission-police.webp";
import MissionRocWebp from "~/assets/images/home/mission-roc.webp";
import MissionSpvWebp from "~/assets/images/home/mission-spv.webp";
import AscPng from "~/assets/images/logo/asc-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import Carousel from "~/components/ui/carousel";

// Cartes statiques : un exemple par dispositif d'engagement, dans l'ordre d'affichage du carrousel.
const MISSION_EXAMPLES = [
  {
    title: "Je deviens sapeur-pompier volontaire",
    image: MissionSpvWebp,
    publisherName: "Sapeurs-pompiers volontaires",
    publisherLogo: SpvPng,
  },
  {
    title: "Je développe le lien social des aînés",
    image: MissionAscWebp,
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    title: "J'intègre les forces terrestres",
    image: MissionRocWebp,
    publisherName: "La réserve des armées",
    publisherLogo: RocPng,
  },
  {
    title: "Je participe à la collecte de produits",
    image: MissionJvaWebp,
    publisherName: "JeVeuxAider.gouv.fr",
    publisherLogo: JvaPng,
  },
  {
    title: "Je deviens réserviste de la Gendarmerie nationale",
    image: MissionGendarmerieWebp,
    publisherName: "Réserve de la Gendarmerie nationale",
    publisherLogo: GendarmeriePng,
  },
  {
    title: "Je deviens réserviste de la Police nationale",
    image: MissionPoliceWebp,
    publisherName: "Réserve opérationnelle de la Police nationale",
    publisherLogo: "https://api-engagement-bucket.s3.fr-par.scw.cloud/publishers/65f07ba338b232a6341ed1e2/Logo%20Police%20Nationale.jpg",
  },
];

export default function MissionExamples() {
  return (
    <section className="relative z-10 pt-4 md:pt-8" aria-label="Exemples de missions d'engagement">
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
          {MISSION_EXAMPLES.map((mission) => (
            <div key={mission.title} className="bg-background border-border-default-grey flex h-full w-full overflow-hidden border shadow-lg">
              <img src={mission.image} alt="" className="w-28 shrink-0 object-cover" loading="lazy" />
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h3 className="fr-h6 line-clamp-2 mb-0!">{mission.title}</h3>
                <div className="fr-mt-auto flex items-center gap-2">
                  <div className="size-10 rounded bg-white">
                    <img src={mission.publisherLogo} aria-hidden="true" alt="" className="size-full object-contain" />
                  </div>
                  <span className="fr-text--xs text-mention-grey line-clamp-1 mb-0!">{mission.publisherName}</span>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

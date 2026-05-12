import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import SpvPng from "~/assets/images/spv-logo.png";

type MissionExample = {
  id: string;
  image: string;
  location: string;
  schedule: string;
  body: string;
  publisherName: string;
  publisherLogo: string;
};

const MISSIONS: MissionExample[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=400&q=80",
    location: "Paris (75)",
    schedule: "Régulier",
    body: "Accompagner les personnes âgées isolées dans leurs sorties quotidiennes.",
    publisherName: "Les Petits Frères des Pauvres",
    publisherLogo: RocPng,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80",
    location: "Lyon (69)",
    schedule: "Ponctuel le week-end",
    body: "Distribuer des repas chauds aux personnes sans-abri pendant l'hiver.",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=400&q=80",
    location: "Marseille (13)",
    schedule: "Mission longue",
    body: "Participer au nettoyage des plages et à la sensibilisation à l'écologie.",
    publisherName: "JeVeuxAider",
    publisherLogo: JvaPng,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=400&q=80",
    location: "Bordeaux (33)",
    schedule: "Engagement à long terme",
    body: "Devenir sapeur-pompier volontaire et protéger ta commune.",
    publisherName: "Pompiers de France",
    publisherLogo: SpvPng,
  },
];

export default function MissionExamples() {
  return (
    <section className="bg-beige-gris-galet-975 relative">
      <div className="fr-container fr-pb-8w">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MISSIONS.map((mission) => (
            <article key={mission.id} className="bg-background flex overflow-hidden rounded shadow-sm">
              <img src={mission.image} alt="" className="aspect-square w-32 shrink-0 object-cover" loading="lazy" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-col gap-1">
                  <p className="fr-tag fr-tag--sm fr-icon-map-pin-2-line w-fit">{mission.location}</p>
                  <p className="fr-tag fr-tag--sm fr-icon-time-line w-fit">{mission.schedule}</p>
                </div>
                <p className="fr-text--sm text-title-grey fr-mb-0 line-clamp-3">{mission.body}</p>
                <div className="fr-mt-auto flex items-center gap-2">
                  <img src={mission.publisherLogo} alt="" className="size-6 rounded object-contain" />
                  <span className="fr-text--xs text-mention-grey line-clamp-1">{mission.publisherName}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

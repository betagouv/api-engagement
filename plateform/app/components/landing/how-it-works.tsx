import { Link } from "react-router";
import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";

type Feature = {
  icon: string;
  title: string;
};

const FEATURES: Feature[] = [
  { icon: CalendarSvg, title: "D'un jour ponctuel à un engagement régulier" },
  { icon: MoneySvg, title: "Indemnisées ou bénévoles, à toi de choisir" },
  { icon: LocationFranceSvg, title: "Partout en France et en Outre-mer" },
  { icon: SelfTrainingSvg, title: "Expérience valorisante, compétences réelles" },
];

export default function HowItWorks() {
  return (
    <section>
      <div className="fr-container fr-py-12w">
        <div className="text-center fr-mb-6w">
          <p className="fr-text--sm fr-mb-2w text-blue-france-sun font-bold uppercase">À propos des missions</p>
          <h2 className="fr-h2 fr-mb-3w">Des missions qui s'adaptent à toi</h2>
          <p className="fr-text--lead text-title-grey mx-auto max-w-2xl">Trouve la mission qui te ressemble : durée, lieu, type d'engagement, on a forcément ce qu'il te faut.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 fr-mb-6w">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center">
              <img src={feature.icon} alt="" className="size-20 fr-mb-3w" aria-hidden="true" />
              <p className="text-title-grey font-bold fr-mb-0">{feature.title}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link to="/missions" className="fr-btn fr-btn--lg">
            Trouve ta mission
          </Link>
          <p className="fr-text--sm text-mention-grey fr-mb-0">…ou commence par le quiz si tu hésites encore.</p>
        </div>
      </div>
    </section>
  );
}

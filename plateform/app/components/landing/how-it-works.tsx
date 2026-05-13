import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import { Link } from "react-router";

import Highlight from "../ui/highlight";

type Feature = {
  icon: string;
  title: string;
};

const FEATURES: Feature[] = [
  { icon: CalendarSvg, title: "À ton rythme Ponctuel ou régulier" },
  { icon: MoneySvg, title: "Avec ou sans indemnité selon les missions" },
  { icon: LocationFranceSvg, title: "Partout en France et à l'étranger" },
  { icon: SelfTrainingSvg, title: "Compatible sans diplôme études ou emploi" },
];

export default function HowItWorks() {
  return (
    <section className="fr-container fr-mb-12w">
      <div className="text-center fr-mb-6w">
        <p className="fr-text--lg font-medium">Comment ça marche ?</p>
        <h2 className="fr-h1">
          Des missions qui <Highlight>s'adaptent à toi</Highlight>
        </h2>
        <p className="fr-text--lead fr-mb-0">Il existe plein de façons de s'engager, selon tes besoins et tes disponibilités.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 fr-mb-6w">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-background flex flex-col items-center gap-4 p-6 text-center shadow-lg max-w-60 mx-auto">
            <img src={feature.icon} alt="" className="size-16" aria-hidden="true" />
            <p className="fr-text--lead text-title-grey font-bold mb-0!">{feature.title}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link to="/missions" className="fr-btn fr-btn--secondary fr-btn--lg">
          Je découvre les missions
        </Link>
        <p className="fr-text--sm text-mention-grey fr-mb-0">+25 000 missions disponibles partout en France</p>
      </div>
    </section>
  );
}

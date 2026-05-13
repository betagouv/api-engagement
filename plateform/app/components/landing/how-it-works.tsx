import { Link } from "react-router";
import CalendarSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/calendar.svg?url";
import LocationFranceSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/location-france.svg?url";
import MoneySvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/money.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";

type Feature = {
  icon: string;
  title: string;
  subtitle: string;
};

const FEATURES: Feature[] = [
  { icon: CalendarSvg, title: "À ton rythme", subtitle: "Ponctuel ou régulier" },
  { icon: MoneySvg, title: "Avec ou sans indemnité", subtitle: "selon les missions" },
  { icon: LocationFranceSvg, title: "Partout en France", subtitle: "et à l'étranger" },
  { icon: SelfTrainingSvg, title: "Compatible sans diplôme", subtitle: "études ou emploi" },
];

export default function HowItWorks() {
  return (
    <section>
      <div className="fr-container fr-py-12w">
        <div className="text-center fr-mb-6w">
          <p className="fr-text--sm fr-mb-2w text-mention-grey">Comment ça marche ?</p>
          <h2 className="fr-h2 fr-mb-2w">
            Des missions qui <span className="bg-[#fceeac] px-1">s'adaptent à toi</span>
          </h2>
          <p className="fr-text--lead text-title-grey fr-mb-0">Il existe plein de façons de s'engager, selon tes besoins et tes disponibilités.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 fr-mb-6w">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-background flex flex-col items-center gap-4 rounded-lg p-6 text-center shadow-sm">
              <img src={feature.icon} alt="" className="size-16" aria-hidden="true" />
              <div>
                <p className="text-title-grey font-bold fr-mb-1w">{feature.title}</p>
                <p className="text-title-grey fr-text--sm fr-mb-0">{feature.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link to="/missions" className="fr-btn fr-btn--secondary fr-btn--lg">
            Je découvre les missions
          </Link>
          <p className="fr-text--sm text-mention-grey fr-mb-0">+25 000 missions disponibles partout en France</p>
        </div>
      </div>
    </section>
  );
}

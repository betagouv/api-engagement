import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import NavyBachiSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/navy-bachi.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import HeroPng from "~/assets/images/people-landing.png";

export default function Hero({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="bg-blue-france-975 relative overflow-hidden">
      <div className="fr-container relative pb-8 lg:min-h-[715px] lg:pb-0">
        <div className="relative z-10 pt-8 lg:max-w-[620px] lg:pt-[100px]">
          <p className="fr-h4 text-blue-france-sun mb-2!">Tu veux te rendre utile ?</p>
          <h1 className="text-blue-france-sun! fr-mb-2w text-5xl! leading-tight! md:text-6xl! lg:text-7xl! xl:text-8xl!">À chacun sa façon d'agir</h1>
          <p className="fr-text--lead fr-mb-4w">
            Des missions d'engagement en bénévolat, service civique, pompiers ou réservistes dans la gendarmerie dès 16 ans pour changer les choses (même un peu).
          </p>

          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! lg:w-[349px]!">
            Trouve ta mission
          </button>
          <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! italic">Réponds en quelques clics, on te propose une mission qui te correspond</p>
        </div>

        {/* Desktop : le visuel démarre après la colonne de titre et déborde à droite du conteneur (débord clippé par la section). */}
        <div className="relative h-[360px] w-full md:h-[520px] lg:absolute lg:inset-y-0 lg:right-[-116px] lg:h-auto lg:w-[812px]">
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="text-yellow-moutarde-975 absolute top-[11%] left-1/2 h-[76%] w-[63%] -translate-x-1/2">
            <ellipse cx="50" cy="50" rx="50" ry="50" fill="currentColor" />
          </svg>
          <img src={HeroPng} alt="" className="absolute inset-0 size-full object-contain object-bottom lg:object-cover" />
          <img src={NavyBachiSvg} alt="" aria-hidden="true" className="absolute top-[20%] left-[41%] hidden w-[16%] lg:block" />
          <img src={FirefighterSvg} alt="" aria-hidden="true" className="absolute top-[9%] left-[27%] hidden w-[14%] lg:block" />
          <img src={BackpackSvg} alt="" aria-hidden="true" className="absolute top-[10%] left-[84%] hidden w-[21%] lg:block" />
        </div>
      </div>
    </section>
  );
}

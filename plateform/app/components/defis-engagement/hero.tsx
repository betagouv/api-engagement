import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import NavyBachiSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/navy-bachi.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import HeroPng from "~/assets/images/people-landing.png";

export default function Hero({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="bg-blue-france-975 relative overflow-hidden lg:min-h-[max(700px,45vw)]">
      <div className="fr-container relative z-10 pb-8 lg:pb-0">
        <div className="pt-8 lg:max-w-[620px] lg:pt-[100px]">
          <p className="fr-h4 text-blue-france-sun mb-2!">Tu veux te rendre utile ?</p>
          <h1 className="text-blue-france-sun! fr-mb-2w text-5xl! leading-tight! md:text-6xl! lg:text-7xl! xl:text-8xl!">À chacun sa façon d'agir</h1>
          <p className="fr-text--lead fr-mb-4w">
            Des missions d'engagement en bénévolat, service civique, pompiers ou réservistes dans la gendarmerie dès 16 ans pour changer les choses (même un peu).
          </p>

          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! lg:w-[349px]!">
            Trouve ta mission
          </button>
          <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! italic lg:max-w-[349px]">Réponds en quelques clics, on te propose une mission qui te correspond</p>
        </div>
      </div>

      {/* Le visuel garde le ratio de la photo : les décors sont positionnés en % de cette boîte. Sur desktop il déborde à droite (débord clippé par la section). */}
      <div className="relative aspect-[4080/2724] w-full lg:absolute lg:bottom-0 lg:left-[42.6%] lg:w-[66.2%]">
        <div className="bg-yellow-moutarde-975 absolute top-0 left-[22.8%] aspect-square w-[50.4%] rounded-full" />
        <img src={HeroPng} alt="" className="relative size-full" />
        <img src={FirefighterSvg} alt="" aria-hidden="true" className="absolute -top-[0.7%] left-[25.4%] hidden w-[9.1%] rotate-[18deg] lg:block" />
        <img src={NavyBachiSvg} alt="" aria-hidden="true" className="absolute top-[11.9%] left-[37.6%] hidden w-[10.7%] rotate-[15deg] lg:block" />
        <img src={BackpackSvg} alt="" aria-hidden="true" className="absolute top-[2%] left-[74.9%] hidden w-[12.8%] rotate-[-27deg] lg:block" />
      </div>
    </section>
  );
}

import FirefighterSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/firefighter.svg?url";
import NavyBachiSvg from "@gouvfr/dsfr/dist/artwork/pictograms/institutions/navy-bachi.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";
import HeroPng from "~/assets/images/people-landing.png";

export default function Hero({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="bg-blue-france-975 relative overflow-hidden md:min-h-[max(560px,45vw)] lg:min-h-[max(700px,45vw)]">
      <div className="fr-container relative z-10 pb-8 md:pb-0">
        <div className="pt-8 md:max-w-[390px] md:pt-11 lg:max-w-[620px] lg:pt-[100px]">
          <p className="fr-h4 text-blue-france-sun mb-2!">Tu veux te rendre utile ?</p>
          <h1 className="text-blue-france-sun! fr-mb-2w text-5xl! leading-tight! md:text-6xl! lg:text-7xl! xl:text-8xl!">À chacun sa façon d'agir</h1>
          <p className="fr-text--lead fr-mb-4w">
            Des missions d'engagement en bénévolat, service civique, pompiers ou réservistes dans la gendarmerie dès 16 ans pour changer les choses (même un peu).
          </p>

          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! md:w-[349px]!">
            Trouve ta mission
          </button>
          <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! italic md:max-w-[349px]">Réponds en quelques clics, on te propose une mission qui te correspond</p>
        </div>
      </div>

      {/* Le visuel garde le ratio de la photo à partir de la tablette (débord clippé par la section) ; sur mobile
          il est recadré plus haut, comme dans la maquette. Les décors restent hors de la boîte rognée. */}
      <div className="relative w-full md:absolute md:bottom-0 md:left-[42.6%] md:w-[66.2%]">
        <div className="relative aspect-[390/346] w-full overflow-hidden md:aspect-[4080/2724] md:overflow-visible">
          <div className="bg-yellow-moutarde-975 absolute top-0 left-[-15.6%] h-[121.4%] w-[131.3%] rounded-full md:left-[22.8%] md:h-auto md:aspect-square md:w-[50.4%]" />
          <img src={HeroPng} alt="" className="relative size-full object-cover" />
        </div>
        <img src={FirefighterSvg} alt="" aria-hidden="true" className="absolute top-[-4.3%] left-[14.1%] w-[19.6%] rotate-[18deg] md:top-[-0.7%] md:left-[25.4%] md:w-[9.1%]" />
        <img src={NavyBachiSvg} alt="" aria-hidden="true" className="absolute top-[-4.1%] left-[33.4%] w-[18.1%] rotate-[15deg] md:top-[11.9%] md:left-[37.6%] md:w-[10.7%]" />
        <img src={BackpackSvg} alt="" aria-hidden="true" className="absolute top-[4.3%] left-[85.8%] w-[27.3%] rotate-[-27deg] md:top-[2%] md:left-[74.9%] md:w-[12.8%]" />
      </div>
    </section>
  );
}

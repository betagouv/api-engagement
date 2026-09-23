import HeroWebp from "~/assets/images/landings/defis-engagement/hero.webp";

export default function Hero({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="bg-beige-gris-galet-975 relative overflow-hidden rounded-b-[20px] md:min-h-130 md:rounded-none lg:min-h-[max(664px,46vw)]">
      <div className="fr-container relative z-10">
        <div className="pt-8 md:max-w-98 md:pt-11 lg:max-w-156 lg:pt-24">
          <p className="fr-h4 text-title-grey! mb-0! md:mb-2! lg:text-[32px]! lg:leading-10!">Tu veux te rendre utile ?</p>
          <h1 className="text-title-grey! fr-mb-2w text-[40px]! leading-12! lg:text-[80px]! lg:leading-22!">À chacun sa façon d'agir</h1>
          <p className="fr-text--lead mb-8! md:mb-6!">
            Des missions d'engagement en bénévolat, Service Civique, pompiers ou réservistes dans la gendarmerie dès 16 ans pour changer les choses (même un peu).
          </p>

          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! md:max-w-60!">
            Trouve ta mission
          </button>
          <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! text-center italic md:max-w-60! md:text-left">
            Réponds en quelques clics, on te propose une mission qui te correspond
          </p>
        </div>
      </div>

      {/* Visuel calé en bas de la section : sous le texte sur mobile, à droite à partir de la tablette (le débord
          à droite sur tablette est rogné par la section, comme dans la maquette). */}
      <img src={HeroWebp} alt="" className="mx-auto aspect-774/662 w-[97%] md:absolute md:bottom-0 md:left-[45.3%] md:mt-0 md:w-[60.2%] lg:right-0 lg:left-auto lg:w-[53.75%]" />
    </section>
  );
}

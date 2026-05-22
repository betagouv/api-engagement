import Highlight from "../ui/highlight";

interface HeroProps {
  onStartQuiz: () => void;
}

export default function Hero({ onStartQuiz }: HeroProps) {
  return (
    <section className="fr-container pt-4! lg:py-12! lg:pb-0!">
      <div className="relative z-10 w-full lg:w-1/2">
        <h4 className="fr-h4">Tu veux te rendre utile ?</h4>
        <h1 className="text-4xl! md:text-5xl! lg:text-7xl! text-title-grey">
          À <Highlight>chacun</Highlight>
          <br /> sa façon d'<Highlight>agir</Highlight>
        </h1>
        <p className="fr-text--lead text-title-grey fr-mb-4w">
          Des milliers de missions concrètes t'attendent, selon tes envies, ton rythme, tes valeurs. Réponds à quelques questions, on trouve la mission qui correspond à ce que tu
          es, là où tu en es.
        </p>

        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! lg:w-auto! justify-center!">
          Je commence le quiz
        </button>
        <p className="fr-text--md text-mention-grey fr-mt-1w w-full! text-center! lg:text-left!">Sans inscription</p>
      </div>
    </section>
  );
}

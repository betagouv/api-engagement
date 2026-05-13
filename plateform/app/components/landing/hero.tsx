import Highlight from "../ui/highlight";

interface HeroProps {
  onStartQuiz: () => void;
}

export default function Hero({ onStartQuiz }: HeroProps) {
  return (
    <section className="fr-container fr-py-8w lg:fr-py-12w">
      <div className="relative z-10 w-1/2">
        <h1 className="fr-display--lg text-title-grey">
          À <Highlight>chacun</Highlight>
          <br /> sa façon d'<Highlight>agir</Highlight>
        </h1>
        <p className="fr-text--lead text-title-grey fr-mb-4w">
          Aide les autres, protège la nature, participe à des projets solidaires… Réponds à quelques questions et découvre les missions d'engagement faites pour toi.
        </p>

        <div className="flex flex-col items-center gap-2 w-fit">
          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg">
            Je commence le quiz
          </button>
          <p className="fr-text--md text-mention-grey fr-mb-0">3 min pour t'engager</p>
        </div>
      </div>
    </section>
  );
}

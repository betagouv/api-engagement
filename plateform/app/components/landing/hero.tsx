import Highlight from "../ui/highlight";

import ZigZagArrowSvg from "~/assets/svg/zig-zag-arrow.svg";

interface HeroProps {
  onStartQuiz: () => void;
}

export default function Hero({ onStartQuiz }: HeroProps) {
  return (
    <section className="fr-container fr-pt-4w lg:fr-py-12w lg:pb-0">
      <div className="relative z-10 w-full lg:w-1/2">
        <h1 className="fr-display--xs lg:fr-display--lg text-title-grey">
          À <Highlight>chacun</Highlight>
          <br /> sa façon d'<Highlight>agir</Highlight>
        </h1>
        <p className="fr-text--lead text-title-grey fr-mb-4w">
          Aide les autres, protège la nature, participe à des projets solidaires… Réponds à quelques questions et découvre les missions d'engagement faites pour toi.
        </p>

        <div className="flex flex-col items-center gap-2 w-full lg:w-fit relative">
          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full lg:w-auto justify-center">
            Je commence le quiz
          </button>
          <p className="fr-text--md text-mention-grey fr-mb-0">3 min pour t'engager</p>
          <img src={ZigZagArrowSvg} alt="Zigzag arrow" className="hidden md:block size-16 absolute left-1/2 -translate-x-full -bottom-0 translate-y-full" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

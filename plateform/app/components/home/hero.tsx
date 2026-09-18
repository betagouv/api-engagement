import HeroBackgroundPng from "~/assets/images/home/hero-background.png";

const CHIPS = [
  { icon: "fr-icon-team-line", className: "bg-green-bourgeon-975 text-[#4b9f6c]", label: "Rencontrer des nouvelles personnes" },
  { icon: "fr-icon-briefcase-line", className: "bg-blue-france-950 text-blue-france-sun", label: "Trouver une première expérience" },
  { icon: "fr-icon-plant-line", className: "bg-blue-france-950 text-blue-france-sun", label: "Devenir bénévole" },
  { icon: "fr-icon-search-line", className: "bg-yellow-tournesol-950 text-[#dfb135]", label: "Découvrir un métier" },
  { icon: "fr-icon-heart-line", className: "bg-pink-tuile-950 text-[#fa7659]", label: "Me rendre utile" },
  { icon: "fr-icon-money-euro-circle-line", className: "bg-brown-caramel-950 text-[#d69e75]", label: "Trouver une mission indemnisée" },
];

interface HeroProps {
  onStartQuiz: () => void;
}

export default function Hero({ onStartQuiz }: HeroProps) {
  return (
    // Sous `lg`, le collage remonte de 184px derrière le texte (`z-10`) : il passe sous les tuiles et le bouton
    // comme sur la maquette. Un décalage fixe, et non proportionnel, pour que le recouvrement reste le même
    // quelle que soit la largeur — le collage grandit avec l'écran alors que le texte, lui, raccourcit.
    // À partir de `lg`, texte et collage partagent la même cellule de grille : le collage se cale à droite
    // sous le texte et donne sa hauteur au bandeau beige.
    <section className="bg-brown-cafe-creme-975 lg:grid">
      <div className="fr-container relative z-10 py-8! lg:col-start-1 lg:row-start-1 lg:self-center lg:py-0!">
        <div className="w-full lg:max-w-[48%]">
          <h1 className="text-4xl! md:text-5xl! lg:text-6xl! xl:text-7xl! text-title-grey">
            Et si une mission pouvait t'aider
            <br /> à avancer ?
          </h1>
          <p className="fr-text--lead text-default-grey fr-mb-3w">
            Service Civique, réserve militaire, pompiers volontaires, bénévolat… Réponds à quelques questions, et découvre la mission d'engagement qui te correspond !
          </p>

          <ul role="list" className="list-none! flex flex-wrap gap-2 p-0! fr-mb-4w">
            {CHIPS.map((chip) => (
              <li key={chip.label} className="bg-background flex items-center gap-2 rounded-full p-1 shadow-[0_4px_7px_rgba(0,0,0,0.1)]">
                <span aria-hidden="true" className={`${chip.icon} fr-icon--sm flex size-6 items-center justify-center rounded-full ${chip.className}`} />
                <span className="fr-text--xs text-default-grey fr-mb-0 pr-2">{chip.label}</span>
              </li>
            ))}
          </ul>

          <div className="w-full! lg:w-fit! flex flex-col items-center">
            <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg lg:px-12! justify-center! w-full! lg:w-auto!">
              Trouver ma mission
            </button>
            <p className="fr-text--xs text-mention-grey fr-mt-1w w-full! text-center! italic">À un clic de tout l'engagement public.</p>
          </div>
        </div>
      </div>

      <div className="-mt-46 w-full lg:col-start-1 lg:row-start-1 lg:mt-0 lg:w-[61.1%] lg:max-w-220 lg:justify-self-end">
        <img src={HeroBackgroundPng} alt="" aria-hidden="true" className="w-full" />
      </div>
    </section>
  );
}

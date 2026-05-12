type Benefit = {
  icon: string;
  title: string;
  body: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: "fr-icon-team-line",
    title: "Accompagner vos jeunes",
    body: "Outils pédagogiques et missions adaptées pour soutenir les jeunes vers l'engagement.",
  },
  {
    icon: "fr-icon-checkbox-circle-line",
    title: "Faciliter le parcours",
    body: "Filtres avancés, fiches missions claires et suivi des candidatures en un coup d'œil.",
  },
  {
    icon: "fr-icon-search-line",
    title: "Découvrir l'engagement",
    body: "Explorer toutes les formes d'engagement civique disponibles près de chez vous.",
  },
  {
    icon: "fr-icon-medal-line",
    title: "Valoriser l'expérience",
    body: "Reconnaître les compétences acquises et certifier l'engagement de vos jeunes.",
  },
];

export default function ProSpace() {
  return (
    <section>
      <div className="fr-container fr-py-12w">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <p className="fr-text--sm fr-mb-2w text-blue-france-sun font-bold uppercase">Espace professionnel</p>
            <h2 className="fr-h2 fr-mb-3w">Vous accompagnez des jeunes ?</h2>
            <p className="fr-text--lead text-title-grey fr-mb-4w">
              Vous êtes enseignant, conseiller d'orientation, animateur ou éducateur ? Cet espace vous donne accès à des outils dédiés pour faire découvrir l'engagement à vos
              jeunes.
            </p>
            <a href="#" className="fr-btn fr-btn--lg">
              Découvrir l'espace pro
            </a>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex flex-col gap-3">
                <span className={`${benefit.icon} text-blue-france-sun text-3xl`} aria-hidden="true" />
                <h3 className="fr-h6 fr-mb-0">{benefit.title}</h3>
                <p className="fr-text--sm text-title-grey fr-mb-0">{benefit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

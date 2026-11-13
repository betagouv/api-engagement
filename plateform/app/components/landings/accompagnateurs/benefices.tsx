const BENEFICES = [
  {
    icon: "fr-icon-heart-line",
    bg: "bg-[#f6f286]",
    title: "Reprendre confiance",
    description: "Se sentir utile, retrouver un rythme et des repères, rencontrer de nouvelles personnes.",
    proof: "« J'avais quelque chose d'utile à faire »",
    source:
      "François, bénévole dans le Val-d'Oise après une mission proposée par sa conseillère France Travail. Il signe aujourd'hui son deuxième contrat de travail. · Source : JeVeuxAider.gouv.fr, mesure d'impact 2025",
  },
  {
    icon: "fr-icon-user-line",
    bg: "bg-[#dec3ff]",
    title: "Avancer vers l'emploi",
    description: "Des compétences, des rencontres qui ouvrent des portes et une première expérience à valoriser sur un CV, en entretien ou dans Parcoursup.",
    proof: "7 sur 10",
    big: true,
    source:
      "7 jeunes sur 10 étaient sans emploi ni formation avant leur Service Civique. Autant sont en emploi ou en études un an après. · Source : Ipsos / Agence du Service Civique, 2024",
  },
  {
    icon: "fr-icon-money-euro-circle-line",
    bg: "bg-[#bfccff]",
    title: "Être indemnisé sans perdre ses droits",
    description: "Service Civique, réserves, sapeurs-pompiers volontaires : de nombreuses missions sont indemnisées.",
    proof: "CEJ, ARE, RSA",
    source: "Votre espace indiquera, pour chaque mission, sa compatibilité avec les allocations de la personne accompagnée.",
  },
];

export default function Benefices() {
  return (
    <section className="fr-container" aria-labelledby="benefices">
      <h2 id="benefices" className="fr-h2 mb-4! text-center">
        Pourquoi parler d'engagement aux personnes que vous accompagnez ?
      </h2>
      <p className="fr-text--lead mx-auto mb-8! max-w-225 text-center">
        Face à l'urgence de la formation, de l'orientation, de l'emploi ou du revenu, on n'y pense pas toujours. Pourtant, une mission d'engagement peut beaucoup pour une personne
        en construction de projet.
      </p>
      <ul className="m-0! grid list-none gap-6 p-0! lg:grid-cols-3">
        {BENEFICES.map((b) => (
          <li key={b.title} className="border-border-default-grey bg-background flex flex-col gap-3 rounded-lg border p-7! [&]:pb-7!">
            <span className={`flex size-16 items-center justify-center rounded-[28px] ${b.bg}`}>
              <span className={`${b.icon} text-blue-france-sun`} aria-hidden="true" />
            </span>
            <h3 className="fr-h5 mb-0!">{b.title}</h3>
            <p className="mb-0! text-[15px]">{b.description}</p>
            <p className={`text-blue-france-sun mb-0! font-bold ${b.big ? "text-[44px] leading-tight" : "text-xl"}`}>{b.proof}</p>
            <hr className="mt-auto! pb-0!" />
            <p className="text-mention-grey fr-text--xs mb-0!">{b.source}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

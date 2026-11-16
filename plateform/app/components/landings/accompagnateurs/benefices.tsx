import EuroSvg from "~/assets/svg/accompagnateurs/euro.svg";
import HeartSvg from "~/assets/svg/accompagnateurs/heart.svg";
import SelfTrainingSvg from "~/assets/svg/accompagnateurs/self-training.svg";

const BENEFICES = [
  {
    icon: HeartSvg,
    bg: "bg-[#f6f286]",
    title: "Reprendre confiance",
    description: "Se sentir utile, retrouver un rythme et des repères, rencontrer de nouvelles personnes.",
    proof: "« J'avais quelque chose d'utile à faire »",
    source:
      "François, bénévole dans le Val-d'Oise après une mission proposée par sa conseillère France Travail. Il signe aujourd'hui son deuxième contrat de travail. · Source : JeVeuxAider.gouv.fr, mesure d'impact 2025",
  },
  {
    icon: SelfTrainingSvg,
    bg: "bg-[#dec3ff]",
    title: "Avancer vers l'emploi",
    description: "Des compétences, des rencontres qui ouvrent des portes et une première expérience à valoriser sur un CV, en entretien ou dans Parcoursup.",
    proof: "7 sur 10",
    big: true,
    source:
      "7 jeunes sur 10 étaient sans emploi ni formation avant leur Service Civique. Autant sont en emploi ou en études un an après. · Source : Ipsos / Agence du Service Civique, 2024",
  },
  {
    icon: EuroSvg,
    bg: "bg-[#bfccff]",
    title: "Être indemnisé sans perdre ses droits",
    description: "Service Civique, réserves, sapeurs-pompiers volontaires : de nombreuses missions sont indemnisées.",
    proof: "CEJ, ARE, RSA",
    source: "Votre espace indiquera, pour chaque mission, sa compatibilité avec les allocations de la personne accompagnée.",
  },
];

// Bandeau beige pleine largeur qui colle au bandeau bleu qui précède (`-mt` annule l'espacement entre sections du `main`).
// Les hauteurs minimales (desktop) alignent titres, preuves et sources d'une carte à l'autre, comme dans la maquette.
export default function Benefices() {
  return (
    <section className="bg-brown-cafe-creme-975 -mt-12 py-12 md:-mt-20 md:py-20" aria-labelledby="benefices">
      <div className="fr-container">
        <h2 id="benefices" className="text-title-grey mb-10! text-center text-[28px]! leading-normal! font-bold! md:text-[36px]!">
          Pourquoi parler d'engagement aux personnes que vous accompagnez ?
        </h2>
        <p className="text-default-grey mx-auto mb-10! max-w-225 text-center text-lg!">
          Face à l'urgence de la formation, de l'orientation, de l'emploi ou du revenu, on n'y pense pas toujours. Pourtant, une mission d'engagement peut beaucoup pour une personne
          en construction de projet.
        </p>
        <ul className="m-0! grid list-none! gap-6 p-0! lg:grid-cols-3">
          {BENEFICES.map((b) => (
            <li key={b.title} className="border-border-default-grey bg-background flex flex-col gap-3 rounded-lg border p-7! lg:min-h-121">
              <span className={`flex size-16 shrink-0 items-center justify-center rounded-[28px] ${b.bg}`}>
                <img src={b.icon} alt="" className="size-9" />
              </span>
              <h3 className="fr-h5 mb-0! lg:min-h-14">{b.title}</h3>
              <p className="text-default-grey mb-0! text-[15px]! leading-normal! lg:min-h-21">{b.description}</p>
              <div className="pt-1 lg:min-h-15.25">
                <p className={`text-blue-france-sun mb-0! leading-[1.3]! font-bold! ${b.big ? "text-[44px]!" : "text-xl!"}`}>{b.proof}</p>
              </div>
              <div className="mt-auto pt-2">
                <div aria-hidden="true" className="bg-border-default-grey h-px" />
              </div>
              <p className="text-mention-grey mb-0! text-[13px]! leading-5! lg:min-h-20">{b.source}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

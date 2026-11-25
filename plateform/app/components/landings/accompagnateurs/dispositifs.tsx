import AscPng from "~/assets/images/logo/asc-logo.png";
import ChantiersPng from "~/assets/images/logo/chantiers-benevoles-logo.png";
import CorpsEuropeenPng from "~/assets/images/logo/corps-europeen-solidarite-logo.png";
import FranceVolontairesPng from "~/assets/images/logo/france-volontaires-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import PolicePng from "~/assets/images/logo/police-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import ServiceNationalPng from "~/assets/images/logo/service-national-logo.png";
import CasqueSvg from "~/assets/svg/accompagnateurs/casque.svg";

type Dispositif = { name: string; description: string; logo: string };

const DISPOSITIFS: Dispositif[] = [
  { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: RocPng },
  { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d’intérêt général indemnisées.", logo: AscPng },
  { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: JvaPng },
  { name: "Sapeurs-pompiers de France", description: "Des missions de sapeur-pompier volontaire près de chez soi.", logo: CasqueSvg },
  { name: "Réserve de la Gendarmerie", description: "La réserve opérationnelle de la Gendarmerie.", logo: GendarmeriePng },
  { name: "Réserve de la Police", description: "La réserve opérationnelle de la Police nationale.", logo: PolicePng },
];

const BIENTOT: Dispositif[] = [
  { name: "Chantiers de bénévoles", description: "Des projets collectifs de bénévolat, en France et à l'étranger.", logo: ChantiersPng },
  { name: "Corps européen de solidarité", description: "Des missions de volontariat en Europe et au-delà, de 18 à 30 ans.", logo: CorpsEuropeenPng },
  { name: "France Volontaires", description: "Le volontariat international d'échange et de solidarité.", logo: FranceVolontairesPng },
  { name: "Service national", description: "Dix mois d'engagement militaire volontaire, de 18 à 25 ans.", logo: ServiceNationalPng },
];

// Grille de cartes (logo + nom + description) propre à cette landing : cartes blanches pour les dispositifs réunis,
// grises pour ceux à venir, sans carrousel (le composant `Partners` partagé a un fond et un slider qui ne sont pas dans la maquette).
function Cartes({ items, className = "" }: { items: Dispositif[]; className?: string }) {
  return (
    <ul className="m-0! grid list-none! gap-6 p-0! md:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.name} className={`border-border-default-grey flex items-start gap-4 border p-4! ${className}`}>
          <span className="flex size-15 shrink-0 items-center justify-center rounded-lg bg-white">
            <img loading="lazy" src={d.logo} alt="" className="size-12 object-contain" />
          </span>
          <div className="flex min-h-15 flex-col justify-center">
            <h3 className="text-title-grey mb-0! text-base! leading-6! font-bold!">{d.name}</h3>
            <p className="text-mention-grey mb-0! text-sm! leading-5!">{d.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dispositifs() {
  return (
    <div className="fr-container flex flex-col gap-10 md:gap-16">
      <section aria-labelledby="dispositifs">
        <h2 id="dispositifs" className="text-title-grey mb-6! text-[22px]! leading-9! font-bold!">
          Les 6 dispositifs publics réunis
        </h2>
        <Cartes items={DISPOSITIFS} className="bg-background md:min-h-24" />
      </section>

      <section aria-labelledby="bientot">
        <p className="fr-badge fr-badge--new mb-6!">Bientôt disponible</p>
        <h2 id="bientot" className="text-title-grey mb-6! text-[22px]! leading-9! font-bold!">
          Bientôt sur TrouveTaMission.gouv.fr
        </h2>
        <Cartes items={BIENTOT} className="bg-(--background-alt-grey)" />
      </section>
    </div>
  );
}

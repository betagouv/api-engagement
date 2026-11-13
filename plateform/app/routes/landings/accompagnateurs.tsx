import { useEffect, useRef } from "react";

import AscPng from "~/assets/images/logo/asc-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import Benefices from "~/components/landings/accompagnateurs/benefices";
import PourQui from "~/components/landings/accompagnateurs/pour-qui";
import SignupForm, { SIGNUP_EMAIL_ID } from "~/components/landings/accompagnateurs/signup-form";
import Valeur from "~/components/landings/accompagnateurs/valeur";
import Hero from "~/components/landings/hero";
import Partners from "~/components/layout/partners";
import type { Partner } from "~/config/partners";
import { registerLandingOrigin } from "~/services/tracking";
import { trackPageViewed } from "~/services/tracking/events";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/accompagnateurs";

// Dispositifs déjà réunis (logos disponibles) ; les dispositifs « bientôt » n'ont pas encore de logo dans le dépôt.
const PARTNERS: Partner[] = [
  { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: RocPng },
  { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: AscPng },
  { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: JvaPng },
  { name: "Sapeurs-pompiers de France", description: "Des missions de sapeur-pompier volontaire près de chez soi.", logo: SpvPng },
  { name: "Réserve de la Gendarmerie", description: "La réserve opérationnelle de la Gendarmerie.", logo: GendarmeriePng },
];

const CHIFFRES = [
  { value: "+ de 400 000", label: "occasions de s'engager" },
  { value: "Déjà 6", label: "dispositifs publics réunis, et c'est pas fini" },
  { value: "100 %", label: "des départements couverts, outre-mer compris" },
];

const BIENTOT = [
  { name: "Chantiers de bénévoles", description: "Des projets collectifs de bénévolat, en France et à l'étranger." },
  { name: "Corps européen de solidarité", description: "Des missions de volontariat en Europe et au-delà, de 18 à 30 ans." },
  { name: "France Volontaires", description: "Le volontariat international d'échange et de solidarité." },
  { name: "Service national", description: "Dix mois d'engagement militaire volontaire, de 18 à 25 ans." },
];

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "J'accompagne des jeunes | Trouve ta mission",
    description: "Conseillers, informateurs jeunesse, animateurs : proposez une mission d'engagement aux personnes que vous accompagnez, sans être expert des dispositifs.",
    ogTitle: "Proposez une mission d'engagement, sans être expert des dispositifs",
    ogDescription: "Bénévolat, Service Civique, réserves : une mission aide les personnes que vous accompagnez à se développer et à avancer dans leur projet.",
  });
}

export default function Accompagnateurs() {
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    registerLandingOrigin("accompagnateurs");
    trackPageViewed({ pageName: "landing_accompagnateurs" });
  }, []);

  // Le CTA final renvoie au formulaire du hero : on le remonte et on y place le focus.
  const focusSignup = () => {
    const input = document.getElementById(SIGNUP_EMAIL_ID);
    input?.scrollIntoView({ block: "center" });
    input?.focus();
  };

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-20!">
      <Hero
        badge="Bientôt disponible"
        title="Proposez une mission d'engagement, sans être expert des dispositifs"
        titleClassName="lg:text-[40px]! lg:leading-12!"
        contentClassName="lg:max-w-155"
        description="Bénévolat, Service Civique, réserves : une mission aide les personnes que vous accompagnez à se développer et à avancer dans leur projet."
        action={
          <div className="pb-8 md:pb-14">
            <SignupForm />
          </div>
        }
        className="bg-brown-cafe-creme-975"
      >
        {null}
      </Hero>

      <PourQui />

      <section className="fr-container" aria-labelledby="chiffres">
        <h2 id="chiffres" className="fr-h2 mb-8! text-center">
          Toute l'offre publique d'engagement sur une seule plateforme
        </h2>
        <ul className="m-0! grid list-none gap-6 p-0! text-center md:grid-cols-3">
          {CHIFFRES.map((c) => (
            <li key={c.value}>
              <p className="text-blue-france-sun mb-1! text-[44px] leading-tight font-bold md:text-[56px]">{c.value}</p>
              <p className="mb-0!">{c.label}</p>
            </li>
          ))}
        </ul>
        <p className="text-mention-grey fr-text--sm mt-6! mb-0! text-center">Bénévolat, Service Civique, réserves (police, armées, gendarmerie), sapeurs-pompiers volontaires.</p>
      </section>

      <Benefices />
      <Valeur />

      <Partners style="compact" squareArrows partners={PARTNERS} title="Les 6 dispositifs publics réunis" description={null} />

      <section className="fr-container" aria-labelledby="bientot">
        <p className="fr-badge fr-badge--sm fr-badge--new mb-2!">Bientôt disponible</p>
        <h2 id="bientot" className="fr-h4 mb-6!">
          Bientôt sur TrouveTaMission.gouv.fr
        </h2>
        <ul className="m-0! grid list-none gap-6 p-0! md:grid-cols-2 lg:grid-cols-3">
          {BIENTOT.map((b) => (
            <li key={b.name} className="border-border-default-grey bg-[#f6f6f6] dark:bg-transparent border p-4!">
              <h3 className="fr-text--bold mb-1! text-base">{b.name}</h3>
              <p className="text-mention-grey fr-text--sm mb-0!">{b.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="fr-container text-center" aria-labelledby="cta">
        <h2 id="cta" className="fr-h2">
          Envie de tester l'outil avec les personnes que vous accompagnez ?
        </h2>
        <p className="fr-text--lead mx-auto max-w-225">Laissez votre adresse e-mail : nous vous prévenons dès l'ouverture et vous proposons un échange de 30 minutes.</p>
        <button type="button" onClick={focusSignup} className="fr-btn fr-btn--lg">
          Tester en avant-première
        </button>
      </section>
    </main>
  );
}

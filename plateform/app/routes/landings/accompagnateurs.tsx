import { useEffect, useRef } from "react";

import HeroWebp from "~/assets/images/landings/accompagnateurs/hero.webp";
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
  { value: "+\u00a0de\u00a0400\u00a0000", color: "text-[#6bffaf]", label: "occasions de s'engager" },
  { value: "Déjà 6", color: "text-[#fffa66]", label: "dispositifs publics réunis,\net c’est pas fini" },
  { value: "100 %", color: "text-[#dec3ff]", label: "des départements couverts, outre-mer compris" },
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
        badge={<p className="fr-badge fr-badge--new mb-2!">Bientôt disponible</p>}
        title="Proposez une mission d'engagement, sans être expert des dispositifs"
        titleClassName="lg:text-[40px]! lg:leading-12!"
        contentClassName="lg:max-w-155"
        description="Bénévolat, Service Civique, réserves : une mission aide les personnes que vous accompagnez à se développer et à avancer dans leur projet."
        action={
          <div className="pb-6 md:pb-6 lg:max-w-155 lg:pb-14">
            <SignupForm />
          </div>
        }
        className="bg-brown-cafe-creme-975 lg:min-h-167"
      >
        {/* Visuel calé en bas de la section : centré sous le formulaire sur mobile et tablette, à droite à partir du desktop. */}
        <img
          src={HeroWebp}
          alt=""
          className="mx-auto mb-10 aspect-780/644 w-[calc(100%-2rem)] md:mb-14 md:w-[73%] lg:absolute lg:right-0 lg:bottom-0 lg:mx-0 lg:mb-0 lg:w-[54.2%] lg:max-w-195"
        />
      </Hero>

      <PourQui />

      {/* Bandeau pleine largeur : bleu en thème clair, bleu nuit en thème sombre ; textes aux couleurs fixes de la maquette. */}
      <section className="bg-[#000091] py-8 md:py-12 lg:py-16 dark:bg-[#1b1b35]" aria-labelledby="chiffres">
        <div className="fr-container">
          <h2 id="chiffres" className="mb-8! text-center text-2xl! leading-8! font-bold! text-white! md:text-[32px]! md:leading-normal!">
            Toute l'offre publique d'engagement sur une seule plateforme
          </h2>
          <ul className="m-0! grid list-none! gap-4 p-0! text-center md:grid-cols-3 md:gap-6">
            {CHIFFRES.map((c) => (
              <li key={c.value}>
                <p className={`${c.color} mb-1! text-[40px]! leading-normal! font-bold! md:text-[32px]! md:leading-10! lg:text-[56px]! lg:leading-normal!`}>{c.value}</p>
                <p className="mb-0! text-lg whitespace-pre-line text-white">{c.label}</p>
              </li>
            ))}
          </ul>
          <p className="fr-text--sm mx-auto mt-8! mb-0! max-w-250 text-center text-[#cecece]">
            Bénévolat, Service Civique, réserves (police, armées, gendarmerie), sapeurs-pompiers volontaires.
          </p>
        </div>
      </section>

      <Benefices />
      <Valeur />

      <Partners style="compact" squareArrows partners={PARTNERS} title="Les 6 dispositifs publics réunis" description={null} />

      <section className="fr-container" aria-labelledby="bientot">
        <p className="fr-badge fr-badge--sm fr-badge--new mb-2!">Bientôt disponible</p>
        <h2 id="bientot" className="fr-h4 mb-6!">
          Bientôt sur TrouveTaMission.gouv.fr
        </h2>
        <ul className="m-0! grid list-none! gap-6 p-0! md:grid-cols-2 lg:grid-cols-3">
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

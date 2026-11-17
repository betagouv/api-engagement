import { useEffect, useRef } from "react";

import HeroWebp from "~/assets/images/landings/accompagnateurs/hero.webp";
import Benefices from "~/components/landings/accompagnateurs/benefices";
import Dispositifs from "~/components/landings/accompagnateurs/dispositifs";
import PourQui from "~/components/landings/accompagnateurs/pour-qui";
import SignupForm, { SIGNUP_EMAIL_ID } from "~/components/landings/accompagnateurs/signup-form";
import Valeur from "~/components/landings/accompagnateurs/valeur";
import Hero from "~/components/landings/hero";
import { registerLandingOrigin } from "~/services/tracking";
import { trackPageViewed } from "~/services/tracking/events";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/accompagnateurs";

const CHIFFRES = [
  { value: "+\u00a0de\u00a0400\u00a0000", color: "text-[#6bffaf]", label: "occasions de s'engager" },
  { value: "Déjà 6", color: "text-[#fffa66]", label: "dispositifs publics réunis,\net c’est pas fini" },
  { value: "100 %", color: "text-[#dec3ff]", label: "des départements couverts, outre-mer compris" },
];

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "J'accompagne des jeunes | Trouve ta mission",
    description: "Conseillers, informateurs jeunesse, animateurs : proposez une mission d'engagement aux personnes que vous accompagnez, sans être expert des dispositifs.",
    ogTitle: "Proposez une mission d'engagement, sans être expert des dispositifs",
    ogDescription: "Bénévolat, Service Civique, réserves : une mission aide les personnes que vous accompagnez à se développer et à avancer dans leur projet.",
    robots: "noindex, follow",
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
          <p className="fr-text--sm mx-auto! mt-8! mb-0! max-w-250 text-center text-[#cecece]">
            Bénévolat, Service Civique, réserves (police, armées, gendarmerie), sapeurs-pompiers volontaires.
          </p>
        </div>
      </section>

      <Benefices />
      <Valeur />

      <Dispositifs />

      {/* Bandeau pleine largeur collé au footer : le padding du bas vient du bandeau. */}
      <section className="bg-blue-france-925 py-12 md:py-20" aria-labelledby="cta">
        <div className="fr-container flex flex-col items-center gap-6 text-center">
          <h2 id="cta" className="text-title-grey mb-0! text-2xl! leading-normal! font-bold! md:text-[32px]!">
            Envie de tester l'outil avec les personnes que vous accompagnez ?
          </h2>
          <p className="text-default-grey mb-0! max-w-225 text-lg! leading-normal!">Laissez votre adresse e-mail : nous vous prévenons dès l'ouverture et vous proposons un échange de 30 minutes.</p>
          <button type="button" onClick={focusSignup} className="fr-btn fr-btn--lg">
            S'enregistrer pour tester l'outil
          </button>
        </div>
      </section>
    </main>
  );
}

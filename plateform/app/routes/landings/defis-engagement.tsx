import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { useLoaderData, useNavigate } from "react-router";

import CadreMineurs from "~/components/landings/defis-engagement/cadre-mineurs";
import Etapes from "~/components/landings/defis-engagement/etapes";
import Hero from "~/components/landings/defis-engagement/hero";
import Histoires from "~/components/landings/defis-engagement/histoires";
import Missions from "~/components/landings/defis-engagement/missions";
import Questions from "~/components/landings/defis-engagement/questions";
import TerrainDeJeu from "~/components/landings/defis-engagement/terrain-de-jeu";
import Partners from "~/components/layout/partners";
import { browseMissions } from "~/services/api/missions";
import { trackPageViewed } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/defis-engagement";

// Les 4 missions mises en avant, une par dispositif (demande des testeurs) : bénévolat JeVeuxAider
// ouvert aux mineurs, service civique sportif, sapeur-pompier volontaire en Gironde (SDIS 33) et
// réserve de la Gendarmerie. Un créneau sans résultat est simplement absent du carrousel.
const MISSION_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "benevolat", domaine: "social_solidarite", tranche_age: "moins_18_ans" },
  { dispositif: "service_civique", domaine: "sport_animation" },
  { dispositif: "sapeurs_pompiers", departmentCode: "33" },
  { dispositif: "reserve_gendarmerie" },
];

// Campagnes de redirection dédiées à la landing : les clics partenaires sont attribués à cette page
// plutôt qu'aux campagnes génériques. SPV et Gendarmerie gardent leur lien par défaut, faute de campagne.
const PARTNER_CAMPAIGN_URLS = {
  jva: "https://api.api-engagement.beta.gouv.fr/r/campaign/5ebb9958-8364-4944-8e66-fdc3ef654417",
  service_civique: "https://api.api-engagement.beta.gouv.fr/r/campaign/4b196cba-74f0-48ab-9baf-e518129a45e3",
  spv: "https://api.api-engagement.beta.gouv.fr/r/campaign/8e663030-0173-4fed-9988-6323a4479d8d",
  gendarmerie: "https://api.api-engagement.beta.gouv.fr/r/campaign/66bb4451-03a8-4dbd-9de6-a662da9ed531",
};

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Les défis de l'engagement — Trouve ta mission" },
    {
      name: "description",
      content: "Des missions d'engagement en bénévolat, service civique, pompiers ou réservistes dès 16 ans, dans un cadre pensé pour les mineurs.",
    },
    { property: "og:title", content: "Les défis de l'engagement" },
    { property: "og:description", content: "Dès 16 ans, trouve la mission d'engagement qui te ressemble." },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ missions: MissionBrowse[] }> {
  const missions = await Promise.all(
    MISSION_SLOTS.map(async (slot) => {
      try {
        const res = await browseMissions({ ...slot, pageSize: 1 }, request);
        return res.data[0] ?? null;
      } catch {
        return null;
      }
    }),
  );

  return { missions: missions.filter((mission): mission is MissionBrowse => mission !== null) };
}

export default function DefisEngagement() {
  const { missions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    trackPageViewed({ pageName: "landing_defis_engagement" });
  }, []);

  const handleStartQuiz = () => {
    reset();
    navigate("/quiz/age", { state: { entrySource: "landing_defis_engagement_cta" } });
  };

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-8! md:gap-10! lg:gap-24!">
      <Hero onStartQuiz={handleStartQuiz} />
      <Missions missions={missions} />
      <Etapes onStartQuiz={handleStartQuiz} />
      <TerrainDeJeu />
      <Questions />
      <CadreMineurs />
      <Histoires />
      <Partners style="compact" campaignUrls={PARTNER_CAMPAIGN_URLS} />
    </main>
  );
}

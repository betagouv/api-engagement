import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { useLoaderData, useNavigate } from "react-router";

import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";
import CadreMineurs from "~/components/landings/defis-engagement/cadre-mineurs";
import Etapes from "~/components/landings/defis-engagement/etapes";
import Hero from "~/components/landings/defis-engagement/hero";
import Histoires from "~/components/landings/defis-engagement/histoires";
import Missions from "~/components/landings/defis-engagement/missions";
import Questions from "~/components/landings/defis-engagement/questions";
import TerrainDeJeu from "~/components/landings/defis-engagement/terrain-de-jeu";
import Partners, { type Partner } from "~/components/layout/partners";
import { browseMissions } from "~/services/api/missions";
import { trackPageViewed } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/defis-engagement";

// Les 4 missions mises en avant (demande des testeurs) : deux bénévolats ouverts aux mineurs (solidarité
// et environnement), un service civique sportif et la réserve de la Gendarmerie. Un créneau sans résultat
// est simplement absent du carrousel.
const MISSION_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "benevolat", domaine: "social_solidarite", tranche_age: "moins_18_ans" },
  { dispositif: "service_civique", domaine: "sport_animation", tranche_age: "moins_18_ans" },
  { dispositif: "benevolat", domaine: "environnement_nature", tranche_age: "moins_18_ans" },
  { dispositif: "reserve_gendarmerie" },
];

// Partenaires affichés en bas de la landing, sans les sapeurs-pompiers (demande des testeurs). Les liens
// pointent vers des campagnes dédiées à la landing, pour attribuer les clics à cette page.
const PARTNERS: Partner[] = [
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/5ebb9958-8364-4944-8e66-fdc3ef654417",
    logo: JvaPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général rémunérées.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/4b196cba-74f0-48ab-9baf-e518129a45e3",
    logo: AscPng,
  },
  {
    name: "La réserve de la Gendarmerie nationale",
    description: "Des missions rémunérées de réservistes.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/66bb4451-03a8-4dbd-9de6-a662da9ed531",
    logo: RocPng,
  },
];

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
  const browse = async (filters: MissionBrowseFilters) => {
    try {
      const res = await browseMissions(filters, request);
      return res.data;
    } catch {
      return [];
    }
  };

  // Les missions mises en avant, puis 10 missions ouvertes aux mineurs prises sur une page tirée au
  // hasard parmi les 10 premières, pour varier le carrousel d'une visite à l'autre.
  const results = await Promise.all([
    ...MISSION_SLOTS.map((slot) => browse({ ...slot, pageSize: 1 })),
    browse({ tranche_age: "moins_18_ans", pageSize: 10, page: Math.ceil(Math.random() * 10) }),
  ]);

  // Dédoublonnage : une mission mise en avant peut aussi ressortir dans le complément.
  const missions = new Map(results.flat().map((mission) => [mission.id, mission]));

  return { missions: [...missions.values()] };
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
      <Partners style="compact" partners={PARTNERS} title="Toutes les missions d’engagement vérifiées par l'État" description={null} />
    </main>
  );
}

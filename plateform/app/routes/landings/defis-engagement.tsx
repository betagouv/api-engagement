import type { MissionBrowse } from "@engagement/dto";
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

const MISSIONS_COUNT = 4;

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
  try {
    const res = await browseMissions({ pageSize: MISSIONS_COUNT }, request);
    return { missions: res.data.slice(0, MISSIONS_COUNT) };
  } catch {
    return { missions: [] };
  }
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
    <main id="contenu" tabIndex={-1}>
      <Hero onStartQuiz={handleStartQuiz} />
      <TerrainDeJeu />
      <Etapes onStartQuiz={handleStartQuiz} />
      <Missions missions={missions} onStartQuiz={handleStartQuiz} />
      <Questions onStartQuiz={handleStartQuiz} />
      <CadreMineurs />
      <Histoires onStartQuiz={handleStartQuiz} />
      <Partners style="compact" />
    </main>
  );
}

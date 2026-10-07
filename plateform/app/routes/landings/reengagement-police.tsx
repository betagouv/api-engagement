import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import SearchSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import CommunitySvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/community.svg?url";
import { useEffect, useRef } from "react";
import { useLoaderData } from "react-router";

import AscPng from "~/assets/images/logo/asc-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import Etapes, { type Etape } from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import HeroVisual from "~/components/landings/reengagement-police/hero-visual";
import MissionsBrowser, { FILTER_KEYS } from "~/components/landings/reengagement-police/missions-browser";
import Presentation from "~/components/landings/reengagement-police/presentation";
import Questions from "~/components/landings/reengagement-police/questions";
import Partners from "~/components/layout/partners";
import { type Partner } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackPageViewed } from "~/services/tracking/events";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/reengagement-police";

const PAGE_SIZE = 10;

const ETAPES: Etape[] = [
  { icon: SelfTrainingSvg, title: "Filtrez selon votre profil", description: "Votre âge et votre localisation, pour ne montrer que ce qui existe près de chez vous." },
  { icon: SearchSvg, title: "Comparez les missions disponibles", description: "Une sélection parmi les missions disponibles, pas un annuaire à trier vous-même." },
  { icon: CommunitySvg, title: "Contactez l'organisme en direct", description: "Vous échangez directement avec l'organisme, sans intermédiaire !" },
];

const PARTNERS: Partner[] = [
  { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: RocPng },
  { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: JvaPng },
  { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: AscPng },
  { name: "Sapeurs-pompiers de France", description: "Deviens sapeur-pompier volontaire près de chez toi.", logo: SpvPng },
  { name: "Gendarmerie nationale", description: "Deviens gendarme près de chez toi.", logo: GendarmeriePng },
];

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Votre engagement peut se faire autrement | Trouve ta mission",
    description:
      "Service Civique, réserve militaire, sapeurs-pompiers volontaires, bénévolat… Découvrez les missions d'engagement pour agir, secourir ou protéger près de chez vous.",
    ogTitle: "Votre engagement peut se faire autrement",
    ogDescription: "Service Civique, réserve militaire, sapeurs-pompiers volontaires, bénévolat… Découvrez comment votre engagement va évoluer !",
  });
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ missions: MissionBrowse[]; totalPages: number; page: number }> {
  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);

  const filters: MissionBrowseFilters = { page, pageSize: PAGE_SIZE };
  for (const key of FILTER_KEYS) {
    const values = searchParams.getAll(key);
    if (values.length) filters[key] = values;
  }

  try {
    const res = await browseMissions(filters, request);
    return { missions: res.data, totalPages: Math.max(1, Math.ceil(res.total / PAGE_SIZE)), page };
  } catch {
    return { missions: [], totalPages: 1, page };
  }
}

export default function ReengagementPolice() {
  const { missions, totalPages, page } = useLoaderData<typeof loader>();
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    // Super property de session : relie les évènements suivants (page.viewed /missions, quiz.*, etc.) à cette landing.
    registerLandingOrigin("reengagement_police");
    trackPageViewed({ pageName: "landing_reengagement_police" });
  }, []);

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
      <Hero
        title={
          <>
            Votre engagement <br className="hidden lg:inline" />
            peut se faire autrement
          </>
        }
        titleClassName="lg:w-184 lg:text-[64px]! lg:leading-18!"
        description="Service Civique, réserve militaire, sapeurs-pompiers volontaires, bénévolat… Découvrez comment votre engagement va évoluer !"
        descriptionClassName="lg:max-w-136"
        className="bg-brown-cafe-creme-975 md:min-h-130 lg:min-h-[max(582px,40.4vw)]"
      >
        <HeroVisual />
      </Hero>
      <MissionsBrowser missions={missions} totalPages={totalPages} page={page} landing="landing_reengagement_police" backTo="/reengagement-police" />
      <Etapes etapes={ETAPES} />
      <Presentation />
      <Questions />
      <Partners style="compact" squareArrows partners={PARTNERS} title="Toutes les missions d’engagement vérifiées par l'État" description={null} />
    </main>
  );
}

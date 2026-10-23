import type { MissionBrowseSlot } from "@engagement/dto";
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
import HeroVisual from "~/components/landings/engagement-securite/hero-visual";
import Presentation from "~/components/landings/engagement-securite/presentation";
import Questions from "~/components/landings/engagement-securite/questions";
import Etapes, { type Etape } from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import LocationFilter from "~/components/landings/location-filter";
import Partners from "~/components/layout/partners";
import MissionsBrowser from "~/components/missions/missions-browser";
import { type Partner } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackPageViewed } from "~/services/tracking/events";
import { buildLandingBrowseFilters, type LandingMissionsConfig } from "~/utils/landing-missions";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/engagement-securite";

// Bénévolat et Service Civique : sur les 10 premiers emplacements, seulement les missions « Secourir et protéger »
// ou « Sécurité et secours » ; leurs autres missions arrivent dans la suite de la liste.
const SECURITE_SECOURS = { activite: ["secourir_proteger"], domaine_engagement: ["securite_secours"] };
const ARMEES: MissionBrowseSlot = { filters: { dispositif: ["reserve_armees"] } };
const BENEVOLAT: MissionBrowseSlot = { filters: { dispositif: ["benevolat"] }, anyOf: SECURITE_SECOURS };
const SAPEURS_POMPIERS: MissionBrowseSlot = { filters: { dispositif: ["sapeurs_pompiers"] } };
const SERVICE_CIVIQUE: MissionBrowseSlot = { filters: { dispositif: ["service_civique"] }, anyOf: SECURITE_SECOURS };
const GENDARMERIE: MissionBrowseSlot = { filters: { dispositif: ["reserve_gendarmerie"] } };

// Candidats refusés à la réserve Police : on ne leur repropose jamais la Police. Les emplacements mettent en avant
// armées et bénévolat, la Gendarmerie n'arrivant qu'en 8e position.
const MISSIONS_CONFIG: LandingMissionsConfig = {
  exclude: { dispositif: ["reserve_police_nationale"] },
  // Missions à distance et réserves (sans département) toujours visibles, quelle que soit la localisation.
  includeRemote: true,
  filters: ["departmentCode", "tranche_age", "activite", "domaine_engagement", "dispositif"],
  slots: [ARMEES, BENEVOLAT, SAPEURS_POMPIERS, ARMEES, BENEVOLAT, SERVICE_CIVIQUE, BENEVOLAT, GENDARMERIE, SERVICE_CIVIQUE, BENEVOLAT],
};

const ETAPES: Etape[] = [
  { icon: SelfTrainingSvg, title: "Filtrez selon votre profil", description: "Votre âge et votre localisation, pour ne montrer que ce qui existe près de chez vous." },
  { icon: SearchSvg, title: "Comparez les missions disponibles", description: "Une sélection parmi les missions disponibles, pas un annuaire à trier vous-même." },
  { icon: CommunitySvg, title: "Contactez l'organisme en direct", description: "Vous échangez directement avec l'organisme, sans intermédiaire !" },
];

const PARTNERS: Partner[] = [
  { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: RocPng },
  { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: JvaPng },
  { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: AscPng },
  { name: "Sapeurs-pompiers de France", description: "Devenez sapeur-pompier volontaire près de chez vous.", logo: SpvPng },
  { name: "Gendarmerie nationale", description: "Devenez réserviste de la Gendarmerie près de chez vous.", logo: GendarmeriePng },
];

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Votre engagement peut se faire autrement | Trouve ta mission",
    description:
      "Service Civique, réserve militaire, sapeurs-pompiers volontaires, bénévolat… Découvrez les missions d'engagement pour agir, secourir ou protéger près de chez vous.",
    ogTitle: "Votre engagement peut se faire autrement",
    ogDescription: "Service Civique, réserve militaire, sapeurs-pompiers volontaires, bénévolat… Découvrez comment votre engagement va évoluer !",
    robots: "noindex, follow",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const { searchParams } = new URL(request.url);
  const filters = buildLandingBrowseFilters(searchParams, MISSIONS_CONFIG);
  const page = filters.page ?? 1;

  try {
    const res = await browseMissions(filters, request);
    return { missions: res.data, total: res.total, page };
  } catch {
    return { missions: [], total: 0, page };
  }
}

export default function EngagementSecurite() {
  const { missions, total, page } = useLoaderData<typeof loader>();
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    // Super property de session : relie les évènements suivants (page.viewed /missions, quiz.*, etc.) à cette landing.
    registerLandingOrigin("engagement_securite");
    trackPageViewed({ pageName: "landing_engagement_securite" });
  }, []);

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-26!">
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
        // Mobile et tablette : la localisation est dans le hero (marge basse chevauchée par les premières missions) ;
        // à partir du desktop, elle rejoint la colonne de filtres.
        action={<LocationFilter id="hero-localisation" className="mb-6 md:mb-30 lg:hidden" />}
        className="bg-brown-cafe-creme-975 md:min-h-130 lg:min-h-145.5"
      >
        <HeroVisual />
      </Hero>
      <MissionsBrowser
        missions={missions}
        total={total}
        page={page}
        filters={MISSIONS_CONFIG.filters}
        exclude={MISSIONS_CONFIG.exclude}
        pageName="landing_engagement_securite"
        backTo="/engagement-securite"
        signupSource="landing_page_reengagement_police_nationale"
      />
      <Etapes etapes={ETAPES} />
      <Presentation />
      <Questions />
      <Partners style="compact" squareArrows partners={PARTNERS} title="Toutes les missions d’engagement vérifiées par l'État" description={null} />
    </main>
  );
}

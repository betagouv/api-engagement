import { useEffect, useRef } from "react";
import { useLoaderData, useSearchParams } from "react-router";

import LocationFilter from "~/components/landings/location-filter";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MissionsBrowser, { FILTER_TYPES } from "~/components/missions/missions-browser";
import GradientBg from "~/components/ui/gradient-bg";
import { browseMissions } from "~/services/api/missions";
import { trackPageViewed } from "~/services/tracking/events";
import { buildLandingBrowseFilters, getSelectedValues, type LandingMissionsConfig } from "~/utils/landing-missions";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/missions";

const MISSIONS_CONFIG: LandingMissionsConfig = {
  filters: ["departmentCode", "tranche_age", "type_mission", "activite", "domaine_engagement", "dispositif"],
};

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Toutes les missions d'engagement",
    description: "Parcours toutes les missions de bénévolat, de service civique et de réserve, et filtre par domaine, lieu ou rythme.",
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

export default function MissionsPage() {
  const { missions, total, page } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    // Filtres actifs au chargement (issus de l'URL, ex. arrivée depuis une landing pré-filtrée sur les mineurs).
    const activeFilters = MISSIONS_CONFIG.filters.flatMap((key) => getSelectedValues(searchParams, key).map((value) => `${FILTER_TYPES[key]}:${value}`));
    trackPageViewed({ pageName: "missions_list", activeFilters, filtersPreselected: activeFilters.length > 0 });
  }, []);

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
      {/* Marge basse chevauchée par les premières missions (cf. MissionsBrowser). */}
      <GradientBg className="pb-32 lg:pb-42">
        <div className="fr-container pt-8 md:pt-16">
          <h1 className="fr-h1 mb-2!">Trouve ta mission</h1>
          <p className="fr-text--lead mb-6!">{`${total.toLocaleString("fr-FR")} mission${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}</p>
          {/* Mobile et tablette : la localisation est ici ; à partir du desktop, elle rejoint la colonne de filtres. */}
          <LocationFilter id="hero-localisation" className="lg:hidden" />
        </div>
      </GradientBg>
      <MissionsBrowser missions={missions} total={total} page={page} filters={MISSIONS_CONFIG.filters} pageName="missions_list" backTo="/missions" />
      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="1 e-mail par mois avec nos meilleures missions adaptées à tes critères"
        ctaText="Je m'inscris"
        hintText="1 e-mail. Pas de spam. Tu te désinscris quand tu veux."
      />
      <Partners />
    </main>
  );
}

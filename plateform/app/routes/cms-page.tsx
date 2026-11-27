import type { MissionBrowse, MissionBrowseFilters, MissionDetailResponse } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { data, redirect, useLoaderData, useLocation, useNavigate } from "react-router";

import CmsBlocks, { type CmsBrowserResults } from "~/components/cms";
import { LOCATION_LABEL_PARAM, type Location } from "~/components/landings/location-filter";
import { canonicalCmsPath, getCmsPage, getCmsRedirect, isCmsPreview } from "~/services/cms.server";
import { browseMissions, getMissionDetail } from "~/services/api/missions";
import { browseMissions as browseMissionsFromClient } from "~/services/mission-browse";
import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, LandingName, MissionDetailNavState, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import type { CmsBlock } from "~/types/cms";
import { buildLandingBrowseFilters, getLandingMissionsConfig } from "~/utils/landing-missions";
import { buildMissionBrowseHref } from "~/utils/mission";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/cms-page";

const MISSIONS_CTA = { to: "/quiz/age", label: "Trouver ma mission" };

// Pages (landings, pages éditoriales) pilotées par le CMS, servies à la racine du site (route splat, slug avec « / » possible).
export function meta({ loaderData, location }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return [{ title: "Page introuvable" }];
  return pageMeta(location, {
    title: loaderData.page.seoTitle,
    description: loaderData.page.seoDescription ?? undefined,
    ogTitle: loaderData.page.ogTitle ?? undefined,
    ogDescription: loaderData.page.ogDescription ?? undefined,
    robots: loaderData.preview || loaderData.page.noindex ? "noindex, follow" : undefined,
  });
}

// Sans cet export, React Router n'envoie pas les en-têtes du loader (no-store, noindex de la preview) dans la réponse HTML.
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pathname, search } = new URL(request.url);
  // Ancienne adresse /pages/<slug> et slash final : une seule URL par page.
  const canonical = canonicalCmsPath(pathname);
  if (canonical !== pathname) throw redirect(canonical + search, 301);

  const preview = isCmsPreview(new URL(request.url).searchParams);
  const page = await getCmsPage(params["*"] ?? "", { draft: preview });
  if (!page) {
    // Ancien slug d'une page renommée : 301 vers le slug courant (pas en preview, où l'on veut voir la situation réelle).
    const target = preview ? null : await getCmsRedirect(params["*"] ?? "");
    // max-age borné : un 301 sans durée est gardé indéfiniment par les navigateurs, et un slug repris (A→B→A) ferait boucler les visiteurs qui l'ont suivi.
    if (target) throw redirect(`/${target}${search}`, { status: 301, headers: { "Cache-Control": "public, max-age=3600" } });
    throw data("Page introuvable", { status: 404 });
  }

  const browse = async (filters: MissionBrowseFilters) => {
    try {
      return (await browseMissions(filters, request)).data;
    } catch {
      return [];
    }
  };

  // Missions de chaque bloc « Missions » : les créneaux mis en avant, puis (option) 10 missions d'une page tirée
  // au hasard parmi les 10 premières pour varier le carrousel. Dédoublonnage par id.
  const missionsByBlock: Record<number, MissionBrowse[]> = {};
  // Mission de chaque bloc « Fiche mission » : absente (introuvable, non diffusée, API indisponible) → bloc ignoré.
  const missionDetailsByBlock: Record<number, MissionDetailResponse> = {};
  // Page de résultats du bloc « Liste de missions filtrable » : filtres et page lus dans l'URL.
  const browsersByBlock: Record<number, CmsBrowserResults> = {};
  await Promise.all(
    page.blocks.map(async (block: CmsBlock, index: number) => {
      if (block.__component === "blocks.missions-browser") {
        const filters = buildLandingBrowseFilters(new URL(request.url).searchParams, getLandingMissionsConfig(block));
        const browsePage = filters.page ?? 1;
        try {
          const res = await browseMissions(filters, request);
          browsersByBlock[index] = { missions: res.data, total: res.total, page: browsePage };
        } catch {
          browsersByBlock[index] = { missions: [], total: 0, page: browsePage };
        }
        return;
      }
      if (block.__component === "blocks.mission-detail") {
        try {
          missionDetailsByBlock[index] = await getMissionDetail(block.missionId, request);
        } catch {
          // Bloc ignoré.
        }
        return;
      }
      if (block.__component !== "blocks.missions") return;
      const slots = block.slots.map(({ dispositif, domaineEngagement }) => ({
        ...(dispositif && { dispositif }),
        ...(domaineEngagement && { domaine_engagement: domaineEngagement }),
      }));
      const results = await Promise.all([
        ...slots.map((slot) => browse({ ...slot, pageSize: 1 })),
        ...(block.fillWithRandom ? [browse({ pageSize: 10, page: Math.ceil(Math.random() * 10) })] : []),
      ]);
      missionsByBlock[index] = [...new Map(results.flat().map((mission) => [mission.id, mission])).values()];
    }),
  );

  const result = { page, preview, missionsByBlock, missionDetailsByBlock, browsersByBlock };
  // Preview : brouillon privé, jamais mis en cache (navigateur, CDN) ni indexé ; sans référent, pour que le secret de l'URL ne
  // soit pas transmis à la page suivante (document.referrer, Sentry).
  return preview ? data(result, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } }) : result;
}

export default function CmsLanding() {
  const { page, missionsByBlock, missionDetailsByBlock, browsersByBlock } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  // Dernière page tracée : le composant est réutilisé d'une page du CMS à l'autre, un booléen ignorerait la suivante.
  const trackedOrigin = useRef<string | null>(null);

  // « chacun-pour-tous » → landing_chacun_pour_tous : évènements de la landing historique.
  const origin = page.slug.replaceAll(/[-/]/g, "_");
  const landing: LandingName = `landing_${origin}`;

  useEffect(() => {
    if (trackedOrigin.current === origin) return;
    trackedOrigin.current = origin;
    registerLandingOrigin(origin);
    trackPageViewed({ pageName: landing });
  }, [origin, landing]);

  const onStartQuiz = (section: QuizEntrySection) => {
    // reset() regénère quiz_attempt_id : on réinitialise avant de tracer, pour rattacher cta.clicked au nouveau funnel.
    reset(pathname);
    trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: page.ctaLabel ?? "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: `${landing}_cta`, entrySection: section } });
  };

  // Recherche par adresse du hero (ex. « Trouve ta caserne ») : la mission du dispositif la plus proche, ouverte sur
  // l'adresse retenue par l'API ; sinon les missions du département.
  const onLocationSearch = async (dispositif: string, { departmentCode, label, lat, lon }: Location) => {
    const { data } = await browseMissionsFromClient({ dispositif: [dispositif], lat, lon, pageSize: 1 });
    const [mission] = data;
    if (mission) {
      navigate(buildMissionBrowseHref(mission), { state: { entrySource: landing, backTo: pathname } satisfies MissionDetailNavState });
      return;
    }
    const params = new URLSearchParams({ departmentCode, [LOCATION_LABEL_PARAM]: label, lat: String(lat), lon: String(lon) });
    navigate(`/missions?${params}`);
  };

  const missionsCta = (section: CtaSection): LandingCta => ({
    ...MISSIONS_CTA,
    label: page.ctaLabel ?? MISSIONS_CTA.label,
    onClick: () =>
      trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: page.ctaLabel ?? MISSIONS_CTA.label, ctaDestination: "missions_list", destinationPath: MISSIONS_CTA.to }),
  });

  const hasMissionsBrowser = page.blocks.some((block) => block.__component === "blocks.missions-browser");
  // Un hero ou une fiche mission affichée porte déjà le h1 ; sinon, le titre de la page en tient lieu.
  const hasHero = page.blocks.some((block, index) => block.__component === "blocks.hero" || missionDetailsByBlock[index]);

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
      {!hasHero && (
        <div className="fr-container max-w-3xl pt-8 md:pt-16">
          <h1 className="mb-0!">{page.title}</h1>
        </div>
      )}
      <CmsBlocks
        blocks={page.blocks}
        context={{
          landing,
          path: pathname,
          missionsByBlock,
          missionDetailsByBlock,
          browsersByBlock,
          hasMissionsBrowser,
          ctaLabel: page.ctaLabel,
          newsletterLists: page.listesNewsletter ?? undefined,
          onStartQuiz,
          onLocationSearch,
          missionsCta,
        }}
      />
    </main>
  );
}

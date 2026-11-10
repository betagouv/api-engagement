import type { MissionBrowse, MissionBrowseFilters, MissionDetailResponse } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { data, useLoaderData, useLocation, useNavigate } from "react-router";

import CmsBlocks, { type CmsBrowserResults } from "~/components/cms";
import { getCmsPage } from "~/services/cms.server";
import { browseMissions, getMissionDetail } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, LandingName, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import type { CmsBlock } from "~/types/cms";
import { buildLandingBrowseFilters, getCmsBrowserConfig } from "~/utils/landing-missions";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/cms-page";

const MISSIONS_CTA = { to: "/quiz/age", label: "Trouver ma mission" };

// POC : pages (landings, pages éditoriales) pilotées par le CMS, servies sous /pages/:slug.
export function meta({ loaderData, location }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return [{ title: "Page introuvable" }];
  return pageMeta(location, {
    title: loaderData.page.seoTitle,
    description: loaderData.page.seoDescription ?? undefined,
    ogTitle: loaderData.page.ogTitle ?? undefined,
    ogDescription: loaderData.page.ogDescription ?? undefined,
    robots: loaderData.page.noindex ? "noindex, follow" : undefined,
  });
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const page = await getCmsPage(params.slug);
  if (!page) throw data("Page introuvable", { status: 404 });

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
        const filters = buildLandingBrowseFilters(new URL(request.url).searchParams, getCmsBrowserConfig(block));
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

  return { page, missionsByBlock, missionDetailsByBlock, browsersByBlock };
}

export default function CmsLanding() {
  const { page, missionsByBlock, missionDetailsByBlock, browsersByBlock } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  // Dernière page tracée : le composant est réutilisé d'une page du CMS à l'autre, un booléen ignorerait la suivante.
  const trackedOrigin = useRef<string | null>(null);

  // « chacun-pour-tous » → landing_chacun_pour_tous : mêmes évènements que la landing en code.
  const origin = page.slug.replaceAll("-", "_");
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
    trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: `${landing}_cta`, entrySection: section } });
  };

  const missionsCta = (section: CtaSection): LandingCta => ({
    ...MISSIONS_CTA,
    onClick: () => trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: MISSIONS_CTA.label, ctaDestination: "missions_list", destinationPath: MISSIONS_CTA.to }),
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
        context={{ landing, path: pathname, missionsByBlock, missionDetailsByBlock, browsersByBlock, hasMissionsBrowser, onStartQuiz, missionsCta }}
      />
    </main>
  );
}

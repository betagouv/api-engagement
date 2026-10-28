import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { data, useLoaderData, useLocation, useNavigate } from "react-router";

import PageBlocks from "~/components/cms";
import { getPage } from "~/services/cms.server";
import { browseMissions } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, LandingName, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import type { PageBlock } from "~/types/page";
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
  const page = await getPage(params.slug);
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
  await Promise.all(
    page.blocks.map(async (block: PageBlock, index: number) => {
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

  return { page, missionsByBlock };
}

export default function CmsLanding() {
  const { page, missionsByBlock } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);

  // « chacun-pour-tous » → landing_chacun_pour_tous : mêmes évènements que la landing en code.
  const origin = page.slug.replaceAll("-", "_");
  const landing: LandingName = `landing_${origin}`;

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
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

  // Un hero porte déjà le h1 ; sans hero, le titre de la page en tient lieu.
  const hasHero = page.blocks.some((block) => block.__component === "blocks.hero");

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
      {!hasHero && (
        <div className="fr-container max-w-3xl pt-8 md:pt-16">
          <h1 className="mb-0!">{page.title}</h1>
        </div>
      )}
      <PageBlocks blocks={page.blocks} context={{ landing, path: pathname, missionsByBlock, onStartQuiz, missionsCta }} />
    </main>
  );
}

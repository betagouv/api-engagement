import { data, useLoaderData } from "react-router";

import PageBlocks from "~/components/cms";
import { useCmsPage } from "~/components/cms/use-cms-page";
import { getPage, isCmsPreview } from "~/services/cms.server";
import { loadMissionsByBlock } from "~/services/cms-missions.server";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/cms-page";

// POC : pages (landings, pages éditoriales) pilotées par le CMS, servies sous /cms/:slug (noindex tant qu'on compare au rendu en code).
export function meta({ loaderData, location }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return [{ title: "Page introuvable" }];
  return pageMeta(location, {
    title: loaderData.page.seoTitle,
    description: loaderData.page.seoDescription ?? undefined,
    ogTitle: loaderData.page.ogTitle ?? undefined,
    ogDescription: loaderData.page.ogDescription ?? undefined,
    robots: loaderData.page.noindex || loaderData.preview ? "noindex, follow" : undefined,
  });
}

// Reprend les en-têtes du loader (no-store en preview) sur la réponse HTML.
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const preview = isCmsPreview(new URL(request.url));
  const page = await getPage(params.slug, { draft: preview });
  if (!page) throw data("Page introuvable", { status: 404 });

  const missionsByBlock = await loadMissionsByBlock(page.blocks, request);

  // Un brouillon ne doit jamais être mis en cache.
  return data({ page, missionsByBlock, preview }, preview ? { headers: { "Cache-Control": "no-store" } } : undefined);
}

export default function CmsPage() {
  const { page, missionsByBlock, preview } = useLoaderData<typeof loader>();
  const { landing, pathname, onStartQuiz, missionsCta } = useCmsPage({ origin: page.slug.replaceAll("-", "_"), trackView: !preview });

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

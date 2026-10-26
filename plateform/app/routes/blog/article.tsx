import { data, Link, useLoaderData } from "react-router";

import PageBlocks from "~/components/cms";
import { useCmsPage } from "~/components/cms/use-cms-page";
import { getArticle, isCmsPreview } from "~/services/cms.server";
import { loadMissionsByBlock } from "~/services/cms-missions.server";
import { blogListUrl, formatArticleDate } from "~/utils/blog";
import { BLOG_URL, articleUrl } from "~/utils/cms-urls";
import { SITE_URL, pageMeta } from "~/utils/seo";

import type { Route } from "./+types/article";

export function meta({ loaderData, location }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return [{ title: "Article introuvable" }];

  const { article, preview } = loaderData;
  const description = article.seoDescription ?? article.excerpt;
  return [
    ...pageMeta(location, {
      title: `${article.seoTitle ?? article.title} | Trouve ta mission`,
      description,
      ogTitle: article.title,
      ogDescription: article.excerpt,
      image: article.cover ? { url: article.cover.url, alt: article.cover.alternativeText, width: article.cover.width, height: article.cover.height } : undefined,
      ogType: "article",
      robots: article.noindex || preview ? "noindex, follow" : undefined,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description,
        datePublished: article.publicationDate,
        mainEntityOfPage: `${SITE_URL}${articleUrl(article.slug)}`,
        ...(article.author && { author: { "@type": "Person", name: article.author } }),
        ...(article.cover && { image: article.cover.url }),
      },
    },
  ];
}

// Reprend les en-têtes du loader (no-store en preview) sur la réponse HTML.
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const preview = isCmsPreview(new URL(request.url));
  const article = await getArticle(params.slug, { draft: preview });
  if (!article) throw data("Article introuvable", { status: 404 });

  const missionsByBlock = await loadMissionsByBlock(article.blocks, request);

  return data({ article, missionsByBlock, preview }, preview ? { headers: { "Cache-Control": "no-store" } } : undefined);
}

export default function BlogArticle() {
  const { article, missionsByBlock, preview } = useLoaderData<typeof loader>();
  const { landing, pathname, onStartQuiz, missionsCta } = useCmsPage({ origin: `blog_${article.slug.replaceAll("-", "_")}`, trackView: !preview });

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
      <article className="fr-container max-w-3xl pt-8 md:pt-16">
        <Link to={BLOG_URL} className="fr-link fr-icon-arrow-left-line fr-link--icon-left mb-6!">
          Retour au blog
        </Link>
        <h1>{article.title}</h1>
        <p className="fr-text--sm text-mention-grey flex flex-wrap items-center gap-x-4 gap-y-2">
          <time dateTime={article.publicationDate}>{formatArticleDate(article.publicationDate)}</time>
          {article.author && <span>Par {article.author}</span>}
          {article.category && (
            <Link className="fr-tag" to={blogListUrl({ category: article.category.slug })}>
              {article.category.name}
            </Link>
          )}
        </p>
        <p className="fr-text--lead">{article.excerpt}</p>
        {/* Sans texte alternatif renseigné dans la médiathèque, la couverture est décorative. */}
        {article.cover && (
          <figure className="m-0!">
            <img
              src={article.cover.url}
              alt={article.cover.alternativeText ?? ""}
              width={article.cover.width ?? undefined}
              height={article.cover.height ?? undefined}
              className="h-auto max-w-full"
            />
          </figure>
        )}
      </article>
      <PageBlocks blocks={article.blocks} context={{ landing, path: pathname, missionsByBlock, onStartQuiz, missionsCta }} />
    </main>
  );
}

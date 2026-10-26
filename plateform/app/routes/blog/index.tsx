import { data, Link, useLoaderData } from "react-router";

import ArticleCard from "~/components/blog/article-card";
import BlogPagination from "~/components/blog/blog-pagination";
import { useCmsPage } from "~/components/cms/use-cms-page";
import { listArticles, listCategories } from "~/services/cms.server";
import { blogListUrl, parseBlogQuery } from "~/utils/blog";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/index";

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Blog | Trouve ta mission",
    description: "Conseils, témoignages et actualités de l'engagement : bénévolat, Service Civique, pompiers volontaires, réserves.",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const { page, category } = parseBlogQuery(new URL(request.url).searchParams);
  const [list, categories] = await Promise.all([listArticles({ page, category }), listCategories()]);
  // Blog non configuré, ou page au-delà de la dernière.
  if (!list || (page > 1 && page > list.pageCount)) throw data("Page introuvable", { status: 404 });

  return { list, categories, category: category ?? null };
}

export default function BlogIndex() {
  const { list, categories, category } = useLoaderData<typeof loader>();
  useCmsPage({ origin: "blog", trackView: true });

  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container py-8 md:py-16">
        <h1>Blog</h1>

        {categories.length > 0 && (
          <nav aria-label="Catégories d'articles" className="mb-8">
            <ul className="fr-tags-group">
              <li>
                <Link className="fr-tag" to={blogListUrl()} aria-current={category ? undefined : "true"}>
                  Toutes les catégories
                </Link>
              </li>
              {categories.map((item) => (
                <li key={item.slug}>
                  <Link className="fr-tag" to={blogListUrl({ category: item.slug })} aria-current={category === item.slug ? "true" : undefined}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {list.articles.length === 0 ? (
          <p>Aucun article pour le moment.</p>
        ) : (
          <ul className="fr-grid-row fr-grid-row--gutters list-none!">
            {list.articles.map((article) => (
              <li key={article.slug} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <BlogPagination page={list.page} pageCount={list.pageCount} category={category} />
        </div>
      </div>
    </main>
  );
}

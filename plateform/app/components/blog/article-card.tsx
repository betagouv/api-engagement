import type { ArticleSummary } from "@engagement/dto";
import { Link } from "react-router";

import { articleUrl } from "~/utils/cms-urls";
import { formatArticleDate } from "~/utils/blog";

// Carte DSFR d'un article : le titre porte le lien (toute la carte est cliquable via `fr-enlarge-link`).
// L'image est décorative : le titre dit déjà de quoi il s'agit.
export default function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <div className="fr-card fr-enlarge-link">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h2 className="fr-card__title">
            <Link to={articleUrl(article.slug)}>{article.title}</Link>
          </h2>
          <p className="fr-card__desc">{article.excerpt}</p>
          <div className="fr-card__start">
            {article.category && (
              <ul className="fr-tags-group">
                <li>
                  <p className="fr-tag">{article.category.name}</p>
                </li>
              </ul>
            )}
            <p className="fr-card__detail">
              <time dateTime={article.publicationDate}>{formatArticleDate(article.publicationDate)}</time>
            </p>
          </div>
        </div>
      </div>
      {article.cover && (
        <div className="fr-card__header">
          <div className="fr-card__img">
            <img className="fr-responsive-img" src={article.cover.url} alt="" loading="lazy" />
          </div>
        </div>
      )}
    </div>
  );
}

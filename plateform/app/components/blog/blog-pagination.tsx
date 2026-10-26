import { Link } from "react-router";

import { buildPageItems } from "~/components/ui/pagination";
import { blogListUrl } from "~/utils/blog";

// Pagination DSFR en vrais liens (explorables par les moteurs de recherche), contrairement à la pagination à boutons des résultats.
export default function BlogPagination({ page, pageCount, category }: { page: number; pageCount: number; category?: string | null }) {
  if (pageCount <= 1) return null;

  const url = (target: number) => blogListUrl({ page: target, category });

  return (
    <nav role="navigation" className="fr-pagination" aria-label="Pagination des articles">
      <ul className="fr-pagination__list justify-center!">
        <li>
          {page > 1 ? (
            <Link className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label" to={url(page - 1)}>
              Précédent
            </Link>
          ) : (
            <button type="button" className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label" disabled>
              Précédent
            </button>
          )}
        </li>
        {buildPageItems(page, pageCount).map((item, index) =>
          typeof item === "number" ? (
            <li key={item}>
              <Link
                className="fr-pagination__link"
                to={url(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}${item === page ? ", page actuelle" : ""}${item === pageCount ? ", dernière page" : ""}`}
              >
                {item}
              </Link>
            </li>
          ) : (
            <li key={`ellipsis-${index}`}>
              <span className="fr-pagination__link" aria-hidden="true">
                {item}
              </span>
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label" to={url(page + 1)}>
              Suivant
            </Link>
          ) : (
            <button type="button" className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label" disabled>
              Suivant
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}

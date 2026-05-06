interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ELLIPSIS = "…";

function buildPageItems(page: number, totalPages: number): Array<number | typeof ELLIPSIS> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (page < 4) {
    return [1, 2, 3, 4, ELLIPSIS, totalPages];
  }
  if (page > totalPages - 3) {
    return [1, ELLIPSIS, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, ELLIPSIS, page - 1, page, page + 1, ELLIPSIS, totalPages];
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const goTo = (target: number) => {
    if (target < 1 || target > totalPages || target === page) return;
    onPageChange(target);
  };

  const pageItems = buildPageItems(page, totalPages);

  return (
    <nav role="navigation" className="fr-pagination" aria-label="Pagination">
      <ul className="fr-pagination__list justify-center!">
        <li>
          <button type="button" className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label" disabled={page === 1} onClick={() => goTo(page - 1)}>
            Précédent
          </button>
        </li>

        {pageItems.map((item, index) =>
          item === ELLIPSIS ? (
            <li key={`ellipsis-${index}`}>
              <span className="fr-pagination__link" aria-hidden="true">
                {ELLIPSIS}
              </span>
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className="fr-pagination__link"
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}${item === page ? ", page actuelle" : ""}${item === totalPages ? ", dernière page" : ""}`}
                onClick={() => goTo(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}

        <li>
          <button
            type="button"
            className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
            disabled={page === totalPages}
            onClick={() => goTo(page + 1)}
          >
            Suivant
          </button>
        </li>
      </ul>
    </nav>
  );
}

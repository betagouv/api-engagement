interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  disabled?: boolean;
  hasNextPage?: boolean;
  pageItems?: number[];
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

export default function Pagination({ page, totalPages, onPageChange, ariaLabel = "Pagination", disabled = false, hasNextPage, pageItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  const goTo = (target: number) => {
    if (disabled || target < 1 || target === page) return;
    if (hasNextPage === undefined && target > totalPages) return;
    if (hasNextPage !== undefined && target > page && !hasNextPage) return;
    onPageChange(target);
  };

  const items = pageItems ?? buildPageItems(page, totalPages);
  const nextDisabled = disabled || (hasNextPage === undefined ? page === totalPages : !hasNextPage);

  return (
    <nav role="navigation" className="fr-pagination" aria-label={ariaLabel}>
      <ul className="fr-pagination__list justify-center!">
        <li>
          <button type="button" className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label" disabled={disabled || page === 1} onClick={() => goTo(page - 1)}>
            Précédent
          </button>
        </li>

        {items.map((item, index) =>
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
                disabled={disabled || (hasNextPage !== undefined && item > page && !hasNextPage)}
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
            disabled={nextDisabled}
            onClick={() => goTo(page + 1)}
          >
            Suivant
          </button>
        </li>
      </ul>
    </nav>
  );
}

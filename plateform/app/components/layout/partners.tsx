import { useEffect, useId, useRef, useState } from "react";

import { DEFAULT_PARTNERS, type Partner } from "~/config/partners";
import { getScrollBehavior } from "~/utils/motion";

const DEFAULT_TITLE = "Il y a plein d'autres missions…";
const DEFAULT_DESCRIPTION = "…directement sur les sites qui les proposent, jettes-y un coup d'oeil !";

// Bandeau des partenaires, en deux rendus :
// - `default` : grille de deux colonnes ;
// - `compact` : bandeau défilant, flèches alignées sur le titre (home, landings, résultats) ;
//   `squareArrows` les rend carrées, comme celles des carrousels des landings.
// `partners` : liste propre à la page appelante (partenaires affichés et liens de redirection dédiés,
// pour attribuer les clics à cette page). Par défaut, les quatre partenaires génériques.
export default function Partners({
  style = "default",
  partners = DEFAULT_PARTNERS,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  squareArrows = false,
}: {
  style?: "default" | "compact";
  partners?: Partner[];
  title?: string;
  description?: string | null;
  squareArrows?: boolean;
}) {
  const listId = useId();
  const scrollRef = useRef<HTMLUListElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const updateScrollState = () => {
      const maxScrollLeft = list.scrollWidth - list.clientWidth;
      setScrollable(maxScrollLeft > 1);
      setAtStart(list.scrollLeft <= 1);
      setAtEnd(list.scrollLeft >= maxScrollLeft - 1);
    };

    updateScrollState();
    list.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(list);

    return () => {
      list.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [partners.length, style]);

  const handleScroll = (direction: -1 | 1) => {
    const list = scrollRef.current;
    if (!list) return;
    const firstItem = list.firstElementChild;
    const gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
    const step = firstItem ? firstItem.getBoundingClientRect().width + gap : list.clientWidth;
    list.scrollBy({ left: direction * step, behavior: getScrollBehavior() });
  };

  const partnerName = (partner: Partner) =>
    partner.url ? (
      <a href={partner.url} target="_blank" rel="noopener noreferrer" title={`${partner.name} - nouvelle fenêtre`} className="text-title-grey bg-none!">
        {partner.name}
      </a>
    ) : (
      partner.name
    );

  const arrowClassName = squareArrows ? "fr-btn--tertiary size-12! max-h-none! max-w-none! justify-center! before:mr-0!" : "fr-btn--secondary rounded-full";

  if (style === "default") {
    return (
      <section className="bg-beige-gris-galet-975">
        <div className="fr-container fr-py-8w">
          <h2 className="fr-h2 mb-2!">{title}</h2>
          {description && <p className="mb-6! text-title-grey fr-text--lead">{description}</p>}

          <ul role="list" className="list-none! p-0! m-0! grid grid-cols-1 gap-4 md:grid-cols-2">
            {partners.map((partner) => (
              <li key={partner.name} className="flex items-start gap-4">
                <div className="flex items-center justify-center bg-white rounded-sm p-1">
                  <img src={partner.logo} alt="" className="size-10 shrink-0 rounded object-contain" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="fr-mb-0 font-bold">{partnerName(partner)}</p>
                  <p className="fr-mb-0 fr-text--sm fr-text--mention-grey">{partner.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    // `overflow-x-clip` : la liste déborde du conteneur jusqu'au bord de l'écran, sans scroll horizontal de page
    // (`50vw` inclut la barre de défilement, contrairement à la largeur du document).
    <section className="bg-beige-gris-galet-975 overflow-x-clip">
      <div className="fr-container py-6! md:py-8! px-6!">
        <div className="flex items-center justify-between gap-4 fr-mb-3w">
          <div>
            <h2 className="fr-h4 fr-mb-0">{title}</h2>
            {description && <p className="mt-2! mb-0! text-title-grey">{description}</p>}
          </div>
          {scrollable && (
            <div className={`flex shrink-0 ${squareArrows ? "gap-6" : "gap-3"}`}>
              <button
                type="button"
                onClick={() => handleScroll(-1)}
                disabled={atStart}
                aria-label="Voir les partenaires précédents"
                aria-controls={listId}
                className={`fr-btn fr-icon-arrow-left-line fr-icon--md ${arrowClassName}`}
              />
              <button
                type="button"
                onClick={() => handleScroll(1)}
                disabled={atEnd}
                aria-label="Voir les partenaires suivants"
                aria-controls={listId}
                className={`fr-btn fr-icon-arrow-right-line fr-icon--md ${arrowClassName}`}
              />
            </div>
          )}
        </div>

        <ul
          ref={scrollRef}
          id={listId}
          role="list"
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- Liste défilable horizontalement : le tabIndex rend le défilement accessible au clavier (WCAG 2.1.1), la liste elle-même reste non interactive.
          tabIndex={scrollable ? 0 : undefined}
          aria-label={scrollable ? title : undefined}
          className="scrollbar-none list-none! m-0! mr-[calc(50%-50vw)]! flex snap-x snap-mandatory gap-4 overflow-x-auto p-0!"
        >
          {partners.map((partner) => (
            <li key={partner.name} className="flex w-70 shrink-0 snap-start items-center gap-4">
              <div className="flex size-15 shrink-0 items-center justify-center rounded-lg bg-white">
                <img src={partner.logo} alt="" className="size-12 object-contain" aria-hidden="true" />
              </div>
              <div>
                <p className="fr-mb-0 text-title-grey font-bold">{partnerName(partner)}</p>
                <p className="fr-mb-0 fr-text--sm text-mention-grey">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { useEffect, useId, useRef, useState } from "react";

import { DEFAULT_PARTNERS, type Partner } from "~/config/partners";
import { getScrollBehavior } from "~/utils/motion";

// Bandeau défilant avec les flèches alignées sur le titre.
export default function Partners({ partners = DEFAULT_PARTNERS, title }: { partners?: Partner[]; title: string }) {
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
  }, [partners.length]);

  const handleScroll = (direction: -1 | 1) => {
    const list = scrollRef.current;
    if (!list) return;
    const firstItem = list.firstElementChild;
    const gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
    const step = firstItem ? firstItem.getBoundingClientRect().width + gap : list.clientWidth;
    list.scrollBy({ left: direction * step, behavior: getScrollBehavior() });
  };

  return (
    // `overflow-x-clip` : la liste déborde du conteneur jusqu'au bord de l'écran, sans scroll horizontal de page
    // (`50vw` inclut la barre de défilement, contrairement à la largeur du document).
    <section className="bg-beige-gris-galet-975 overflow-x-clip">
      <div className="fr-container py-6! md:py-8! px-6!">
        <div className="flex items-center justify-between gap-4 fr-mb-3w">
          <h2 className="fr-h4 fr-mb-0">{title}</h2>
          {scrollable && (
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => handleScroll(-1)}
                disabled={atStart}
                aria-label="Voir les partenaires précédents"
                aria-controls={listId}
                className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
              />
              <button
                type="button"
                onClick={() => handleScroll(1)}
                disabled={atEnd}
                aria-label="Voir les partenaires suivants"
                aria-controls={listId}
                className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
              />
            </div>
          )}
        </div>

        <ul
          ref={scrollRef}
          id={listId}
          role="list"
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
                <p className="fr-mb-0 text-title-grey font-bold">
                  {partner.url ? (
                    <a href={partner.url} target="_blank" rel="noopener noreferrer" title={`${partner.name} - nouvelle fenêtre`} className="text-title-grey bg-none!">
                      {partner.name}
                    </a>
                  ) : (
                    partner.name
                  )}
                </p>
                <p className="fr-mb-0 fr-text--sm text-mention-grey">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

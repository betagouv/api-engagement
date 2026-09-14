import { Children, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { getScrollBehavior } from "~/utils/motion";

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
  action?: ReactNode;
  previousLabel?: string;
  nextLabel?: string;
  ordered?: boolean;
};

/**
 * Carrousel horizontal accessible : défilement natif avec accroche (scroll snap).
 *
 * Choix d'accessibilité (RGAA) :
 * - la liste ne devient focusable (`tabindex="0"`) que lorsqu'elle déborde, afin que le
 *   défilement reste pilotable au clavier (critère 7.3) ; elle porte alors un nom accessible,
 *   obligatoire dès qu'un conteneur est focusable ;
 * - pas d'`aria-live` : toutes les diapositives sont présentes dans le DOM, une région live
 *   ferait relire l'intégralité du contenu à chaque défilement ;
 * - les flèches ne sont rendues que s'il y a un débordement réel. En mode grille (voir
 *   `listClassName`) elles disparaissent donc d'elles-mêmes au-delà du point de rupture ;
 * - `getScrollBehavior()` respecte `prefers-reduced-motion` (critère 13.8).
 *
 * Mise en page : `-mx-4 px-4 py-6` élargit la zone de défilement au-delà du conteneur tout en gardant
 * les cartes alignées dessus. Ce padding est la marge de sécurité des ombres : `overflow-x: auto`
 * force `overflow-y` à `auto`, donc une carte collée au bord verrait son ombre rognée en bas comme
 * sur les côtés. `scroll-px-4` reporte la même valeur sur les points d'accroche : sans lui,
 * l'accrochage obligatoire ferait défiler le padding et collerait les cartes au bord de l'écran.
 * À garder en unités fixes : un pourcentage de `scroll-padding` se calcule sur la zone de
 * défilement elle-même, pas sur le parent.
 *
 * `listClassName` est l'échappatoire pour passer en grille sur grand écran
 * (ex. `md:grid md:grid-cols-3`), en pensant à neutraliser le débord (`md:mx-0! md:px-0!`).
 * `ordered` rend une `<ol>` quand l'ordre des diapositives porte du sens (des étapes).
 */
export default function Carousel({
  label,
  children,
  className = "",
  listClassName = "",
  itemClassName = "",
  action,
  previousLabel = "Précédent",
  nextLabel = "Suivant",
  ordered = false,
}: Props) {
  const listId = useId();
  const scrollRef = useRef<HTMLUListElement & HTMLOListElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const slides = Children.toArray(children);

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
    // Le ResizeObserver couvre le changement de point de rupture et le chargement des images.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(list);

    return () => {
      list.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [slides.length]);

  const handleScroll = (direction: -1 | 1) => {
    const list = scrollRef.current;
    if (!list) return;
    const firstSlide = list.firstElementChild;
    const gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
    const step = firstSlide ? firstSlide.getBoundingClientRect().width + gap : list.clientWidth;
    list.scrollBy({ left: direction * step, behavior: getScrollBehavior() });
  };

  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className={className}>
      <ListTag
        ref={scrollRef}
        id={listId}
        role="list"
        tabIndex={scrollable ? 0 : undefined}
        aria-label={scrollable ? label : undefined}
        className={`scrollbar-none mt-0! mb-6! flex list-none! snap-x snap-mandatory items-stretch gap-4 md:gap-6 overflow-x-auto -mx-4! px-4! py-6! scroll-px-4! ${listClassName}`}
      >
        {/* Le DSFR pose `content` sur `li::marker` : `list-none` ne suffit pas à masquer le compteur d'une `<ol>`. */}
        {slides.map((slide, index) => (
          <li key={index} className={`list-none! marker:content-none! shrink-0 snap-start ${itemClassName}`}>
            {slide}
          </li>
        ))}
      </ListTag>

      {(scrollable || action) && (
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-3">
          {scrollable && (
            <div className="flex gap-6 md:gap-3">
              <button
                type="button"
                onClick={() => handleScroll(-1)}
                disabled={atStart}
                aria-label={previousLabel}
                aria-controls={listId}
                className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-icon--md rounded-full"
              />
              <button
                type="button"
                onClick={() => handleScroll(1)}
                disabled={atEnd}
                aria-label={nextLabel}
                aria-controls={listId}
                className="fr-btn fr-btn--secondary fr-icon-arrow-right-line fr-icon--md rounded-full"
              />
            </div>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

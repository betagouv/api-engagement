/**
 * Le pied de page GLOBAL (rendu dans `root.tsx`) est masqué sur le parcours quiz
 * et sur `/results` en mobile — là, la route résultats rend son propre footer à
 * l'intérieur du panneau dépliable. Utilisé par le composant `Footer`.
 */
export function isGlobalFooterVisible(pathname: string, isMobile: boolean): boolean {
  const isQuiz = pathname.startsWith("/quiz");
  const isMobileResults = isMobile && pathname.startsWith("/results");
  return !(isQuiz || isMobileResults);
}

/**
 * Indique si la page comporte une cible `#footer` atteignable par le lien d'évitement
 * (RGAA 12.7). Vrai sur toutes les routes SAUF le quiz :
 * - pages standard : footer global (`root.tsx`) ;
 * - `/results` en mobile : la route rend son propre `<FooterContent id="footer">`
 *   (`routes/results.tsx`), donc la cible existe même si le footer global est masqué ;
 * - quiz : aucun footer.
 *
 * On ne se base donc pas sur la visibilité du footer global : celle-ci ne reflète pas
 * la présence effective de la cible dans le parcours résultats mobile.
 */
export function hasFooterTarget(pathname: string): boolean {
  return !pathname.startsWith("/quiz");
}

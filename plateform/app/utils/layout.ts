/**
 * Détermine si le pied de page est affiché pour une route donnée.
 *
 * Source de vérité partagée entre le `Footer` et les liens d'évitement (`SkipLinks`) :
 * le footer est masqué sur le parcours quiz et sur `/results` en mobile, donc le lien
 * d'évitement « Pied de page » ne doit pas être annoncé dans ces cas (RGAA 12.7 —
 * pas de lien vers une cible inexistante).
 */
export function isFooterVisible(pathname: string, isMobile: boolean): boolean {
  const isQuiz = pathname.startsWith("/quiz");
  const isMobileResults = isMobile && pathname.startsWith("/results");
  return !(isQuiz || isMobileResults);
}

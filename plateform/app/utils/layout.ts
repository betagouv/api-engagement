/**
 * Le pied de page GLOBAL (rendu dans `root.tsx`) est masqué sur la page `/results/:id` en mobile —
 * là, la route résultats rend son propre footer à l'intérieur du panneau dépliable.
 * La fiche mission ouverte depuis les résultats (`/results/:id/missions/:missionId`) garde le footer global.
 * Utilisé par le composant `Footer`.
 */
export function isGlobalFooterVisible(pathname: string, isMobile: boolean): boolean {
  return !(isMobile && /^\/results\/[^/]+\/?$/.test(pathname));
}

/**
 * Pages dont le bouton principal est fixé en bas d'écran en mobile (fiche mission) :
 * le footer doit réserver cet espace pour que ses dernières lignes ne soient pas masquées.
 */
export function hasMobileFixedBottomBar(pathname: string): boolean {
  return /\/missions\/[^/]+\/?$/.test(pathname);
}

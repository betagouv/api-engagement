# Détail d'une mission et candidature

## Chargement

La fiche charge une mission à partir de son identifiant. Un paramètre optionnel `addressId` permet de sélectionner une adresse particulière. Pendant le chargement, la page affiche un état dédié. En cas d'échec, elle affiche « Impossible de charger cette mission. » ; si aucune mission n'est disponible sans message plus précis, elle affiche « Mission introuvable. »

Une fiche peut être ouverte depuis `/missions/:missionId` ou depuis `/results/:userScoringId/missions/:missionId`. Dans le second cas, le scoring est conservé pour le retour vers les résultats, le suivi du parcours et l'affichage de missions similaires.

## Informations affichées

Le contrat de détail peut contenir le titre, le domaine, le type, le diffuseur, l'organisation, la localisation, les dates, la durée, le rythme, la compensation, la description, la photo, le mode à distance, l'ouverture aux mineurs, l'accessibilité aux personnes à mobilité réduite et le nombre de places.

Le titre du document est remplacé par le titre de la mission après son chargement. La localisation n'est affichée que lorsqu'elle existe. La date limite est formatée à partir de `endAt` lorsqu'elle est disponible.

## Candidature et navigation

Le bouton « Postuler » ouvre l'URL de candidature dans une nouvelle fenêtre. La fonction de construction du lien peut y ajouter le `userScoringId`. Sur desktop, l'action figure dans un panneau latéral ; sur mobile, elle reste disponible dans une barre fixe.

Depuis une fiche issue des résultats, le retour cible la page de résultats et une section de missions similaires est affichée. Sans scoring dans l'URL, le retour visible cible l'accueil ou le catalogue selon le contexte du composant.

## Sources

- `plateform/app/routes/mission-detail.tsx`
- `plateform/app/components/mission-detail/cta-panel.tsx`
- `plateform/app/components/mission-detail/similar-missions.tsx`
- `plateform/app/utils/mission.ts`
- `packages/dto/src/resources/mission-browse.ts`

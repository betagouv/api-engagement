# Détail d'une mission et candidature

## Chargement

La fiche de mission est chargée à partir de son identifiant unique. Un paramètre optionnel `addressId` peut être utilisé pour spécifier une adresse particulière. Pendant le chargement, un état de chargement est affiché. En cas d'échec du chargement, le message « Impossible de charger cette mission. » est affiché. Si aucune mission n'est trouvée, le message « Mission introuvable. » est affiché.

Les fiches de mission peuvent être ouvertes depuis deux chemins : `/missions/:missionId` et `/results/:userScoringId/missions/:missionId`. Dans le second cas, le `userScoringId` est utilisé pour conserver le scoring lors du retour vers les résultats et pour l'affichage de missions similaires.

## Informations affichées

Les informations détaillées sur la mission incluent le titre, le domaine, le type, le diffuseur, l'organisation, la localisation, les dates de début et de fin, la durée, le rythme, la compensation, la description, la photo, le mode de travail à distance, l'ouverture aux mineurs, l'accessibilité aux personnes à mobilité réduite et le nombre de places disponibles.

Le titre de la page est remplacé par le titre de la mission une fois celle-ci chargée. La localisation est affichée uniquement si elle est disponible. La date limite de candidature est formatée à partir de `endAt` si elle est présente.

## Candidature et navigation

Le bouton « Postuler » permet d'ouvrir l'URL de candidature dans une nouvelle fenêtre. Le lien de candidature peut inclure le `userScoringId` pour le suivi. Sur les appareils de bureau, cette action est disponible dans un panneau latéral, tandis que sur les appareils mobiles, elle est accessible via une barre fixe.

Lorsqu'une fiche est issue des résultats, le retour redirige vers la page de résultats, et une section de missions similaires est affichée. Si l'URL ne contient pas de scoring, le retour redirige vers l'accueil ou le catalogue, selon le contexte.

## Sources

- `plateform/app/routes/mission-detail.tsx`
- `plateform/app/components/mission-detail/cta-panel.tsx`
- `plateform/app/components/mission-detail/similar-missions.tsx`
- `plateform/app/utils/mission.ts`
- `packages/dto/src/resources/mission-browse.ts`

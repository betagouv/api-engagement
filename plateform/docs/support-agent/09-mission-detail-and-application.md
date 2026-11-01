# Détail d'une mission et candidature

## Chargement

La fiche de mission est chargée à partir de son identifiant unique. Un paramètre optionnel `addressId` peut être utilisé pour spécifier une adresse particulière. Pendant le chargement, un état de chargement est affiché. En cas d'échec du chargement, le message « Impossible de charger cette mission. » est affiché. Si aucune mission n'est trouvée, le message « Mission introuvable. » est affiché.

Les fiches de mission peuvent être ouvertes depuis deux chemins : `/missions/:missionId` et `/results/:userScoringId/missions/:missionId`. Dans le second cas, le `userScoringId` est utilisé pour conserver le scoring lors du retour vers les résultats et pour l'affichage de missions similaires.

## Informations affichées

Les informations détaillées sur la mission incluent le titre, le domaine, le type, le diffuseur, l'organisation, la localisation, les dates de début et de fin, la durée, le rythme, la compensation, la description, et la photo.

- **Titre** : Le titre de la mission est affiché et remplace le titre de la page une fois la mission chargée.
- **Domaine** : Affiché sous forme de tag.
- **Type** : Affiché sous forme de label décrivant le type de mission.
- **Diffuseur et Organisation** : Le nom de l'organisation ou du diffuseur est affiché, accompagné de leur logo respectif si disponible.
- **Localisation** : La ville et l'adresse sont affichées si disponibles. Un lien vers Google Maps est proposé si les coordonnées sont présentes.
- **Dates** : La date de début est formatée avec la durée si disponible. La date limite de candidature est formatée à partir de `endAt` si elle est présente.
- **Durée et Rythme** : La durée et le rythme de la mission sont affichés si disponibles.
- **Compensation** : La compensation est affichée avec le montant, le type (brut ou net), et l'unité (par mois, heure, etc.) si disponibles.
- **Description** : La description est affichée en HTML si disponible, sinon en texte brut.
- **Photo** : Une photo de la mission est affichée si disponible.

## Candidature et navigation

Le bouton « Postuler » permet d'ouvrir l'URL de candidature dans une nouvelle fenêtre. Le lien de candidature peut inclure le `userScoringId` pour le suivi. Sur les appareils de bureau, cette action est disponible dans un panneau latéral, tandis que sur les appareils mobiles, elle est accessible via une barre fixe.

Lorsqu'une fiche est issue des résultats, le retour redirige vers la page de résultats, et une section de missions similaires est affichée. Si l'URL ne contient pas de scoring, le retour redirige vers l'accueil ou le catalogue, selon le contexte.

## Sources

- `plateform/app/routes/mission-detail.tsx`
- `plateform/app/components/mission-detail/cta-panel.tsx`
- `plateform/app/components/mission-detail/similar-missions.tsx`
- `plateform/app/utils/mission.ts`
- `packages/dto/src/resources/mission-browse.ts`

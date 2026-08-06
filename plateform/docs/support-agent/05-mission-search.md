# Recherche de missions

## Catalogue et pagination

Le catalogue `/missions` affiche neuf missions par page. Le paramètre `page` est extrait de l'URL, est ramené à un minimum de 1 et prend la valeur 1 s'il est invalide. Le nombre total de pages est toujours d'au moins 1, même si aucun résultat n'est trouvé.

Lorsqu'un filtre est modifié, le paramètre `page` est supprimé pour revenir à la première page. Passer à la page 1 supprime également le paramètre de l'URL, tandis que les pages suivantes utilisent une valeur explicite.

## Filtres

Les filtres disponibles sont :

- `departmentCode` : département ;
- `tranche_age` : tranche d'âge, à sélection unique ;
- `type_mission` : disponibilités ;
- `secteur_activite` : activités ;
- `domaine` : domaine ;
- `dispositif` : organisation ou dispositif.

Les valeurs des filtres sont ordonnées selon leur déclaration dans la taxonomie, et non selon le nombre de résultats. Une valeur marquée `hidden` ou dont la facette a un compte de zéro n'est pas proposée. Tous les filtres, à l'exception de la tranche d'âge, peuvent contenir plusieurs valeurs dans l'URL.

## États de résultat

Lors du premier chargement, la page affiche un état de chargement. En cas d'erreur, une alerte « Erreur lors du chargement des missions » est affichée, suivie du message d'erreur reçu. Un résultat vide sans erreur affiche « Aucune mission ne correspond à ces filtres. » Le total des missions est annoncé à l'utilisateur et mis à jour après chaque recherche.

Une requête précédente est annulée lorsqu'un nouveau jeu de paramètres déclenche une recherche. La réponse du backend contient les missions, le total, la page, la taille de page et les facettes disponibles.

## Sources

- `plateform/app/routes/missions.tsx`
- `plateform/app/services/mission-browse.ts`
- `packages/dto/src/resources/mission-browse.ts`
- `api/src/controllers/mission-browse.ts`
- `api/src/services/mission-browse/index.ts`
- `packages/taxonomy/src/taxonomy.ts`

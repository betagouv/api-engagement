# Recherche de missions

## Catalogue et pagination

Le catalogue `/missions` demande neuf missions par page. Le paramètre `page` est lu dans l'URL, ramené à un minimum de 1 et prend la valeur 1 s'il est invalide. Le nombre total de pages vaut au minimum 1, y compris lorsque le résultat est vide.

Lors d'un changement de filtre, le paramètre `page` est supprimé afin de revenir à la première page. Le passage à la page 1 supprime également le paramètre de l'URL ; les pages suivantes utilisent une valeur explicite.

## Filtres

Les filtres proposés sont :

- `departmentCode` : département ;
- `tranche_age` : tranche d'âge, à sélection unique ;
- `type_mission` : disponibilités ;
- `secteur_activite` : activités ;
- `domaine` : domaine ;
- `dispositif` : organisation ou dispositif.

Les valeurs sont ordonnées selon leur déclaration dans la taxonomie, et non selon leur nombre de résultats. Une valeur marquée `hidden` ou dont la facette vaut zéro n'est pas proposée. Tous les filtres sauf la tranche d'âge peuvent contenir plusieurs valeurs dans l'URL.

## États de résultat

Pendant le premier chargement, la page affiche un état de chargement. Une erreur produit une alerte « Erreur lors du chargement des missions » suivie du message reçu. Un résultat vide sans erreur affiche « Aucune mission ne correspond à ces filtres. » Le total est annoncé à l'utilisateur et mis à jour après chaque recherche.

Une requête précédente est annulée lorsqu'un nouveau jeu de paramètres déclenche une recherche. La réponse backend contient les missions, le total, la page, la taille de page et les facettes disponibles.

## Sources

- `plateform/app/routes/missions.tsx`
- `plateform/app/services/mission-browse.ts`
- `packages/dto/src/resources/mission-browse.ts`
- `api/src/controllers/mission-browse.ts`
- `api/src/services/mission-browse/index.ts`
- `packages/taxonomy/src/taxonomy.ts`

# Vue d'ensemble du produit

La plateforme aide un utilisateur à trouver une mission d'engagement de deux manières : un parcours de recommandation personnalisé et un catalogue filtrable. Elle permet ensuite de consulter une mission, de rejoindre le site de candidature et de recevoir des missions par email.

## Fonctionnalités principales

- Le quiz recueille l'âge, le statut, la localisation, les disponibilités et les motivations de l'utilisateur. Des questions de précision apparaissent selon les réponses précédentes.
- Les réponses sont transformées en valeurs de taxonomies et enregistrées dans un scoring utilisateur.
- Le moteur de matching classe les missions éligibles à partir des taxonomies du scoring et de la proximité géographique.
- La page de résultats sépare les cinq premières recommandations des autres résultats paginés.
- Le catalogue propose une recherche paginée avec des filtres issus des facettes disponibles.
- La fiche mission rassemble les informations pratiques et redirige vers l'URL de candidature du diffuseur.
- Des fonctions d'email, de newsletter et de gestion du consentement complètent le parcours.

## Architecture fonctionnelle

Le navigateur appelle des routes `/api/...` internes à `plateform`. Ces routes constituent une façade SSR et appellent l'API backend avec la clé éditeur conservée côté serveur. Les contrats sont partagés dans `@engagement/dto` et les valeurs métier dans `@engagement/taxonomy`.

Le parcours principal utilise les ressources backend de recherche de missions, de matching, de scoring utilisateur, d'email et de newsletter. La table des routes de `plateform` constitue la liste des pages et endpoints internes disponibles.

## Sources

- `plateform/app/routes.ts`
- `plateform/app/routes/_index.tsx`
- `plateform/app/services/config.ts`
- `plateform/app/components/landing/how-it-works.tsx`
- `plateform/app/components/layout/header.tsx`

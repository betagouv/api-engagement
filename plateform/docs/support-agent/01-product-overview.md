# Vue d'ensemble du produit

La plateforme aide un utilisateur à trouver une mission d'engagement de deux manières : un parcours de recommandation personnalisé et un catalogue filtrable. Elle permet ensuite de consulter une mission, de rejoindre le site de candidature et de recevoir des missions par email.

## Fonctionnalités principales

- **Quiz de profil utilisateur** : Le quiz recueille l'âge, le statut, la localisation, les disponibilités et les motivations de l'utilisateur. Des questions de précision apparaissent selon les réponses précédentes. Les réponses sont transformées en valeurs de taxonomies et enregistrées dans un scoring utilisateur.
- **Moteur de matching** : Le moteur de matching classe les missions éligibles à partir des taxonomies du scoring et de la proximité géographique.
- **Page de résultats** : La page de résultats sépare les cinq premières recommandations des autres résultats paginés.
- **Catalogue de missions** : Le catalogue propose une recherche paginée avec des filtres issus des facettes disponibles.
- **Fiche mission** : La fiche mission rassemble les informations pratiques et redirige vers l'URL de candidature du diffuseur.
- **Fonctionnalités d'email et de newsletter** : Des fonctions d'email, de newsletter et de gestion du consentement complètent le parcours.

## Acteurs

Les principaux acteurs de la plateforme incluent :

- **Utilisateurs finaux** : Chercheurs de missions d'engagement qui interagissent avec le quiz, le moteur de matching, et le catalogue de missions.
- **Administrateurs** : Gèrent les configurations et les mises à jour de la plateforme.
- **Partenaires** : Organisations qui publient des missions d'engagement sur la plateforme.

## Architecture fonctionnelle

Le navigateur appelle des routes `/api/...` internes à `plateform`. Ces routes constituent une façade SSR et appellent l'API backend avec la clé éditeur conservée côté serveur. Les contrats sont partagés dans `@engagement/dto` et les valeurs métier dans `@engagement/taxonomy`.

Le parcours principal utilise les ressources backend de recherche de missions, de matching, de scoring utilisateur, d'email et de newsletter. La table des routes de `plateform` constitue la liste des pages et endpoints internes disponibles.

### Routes et Endpoints

- **Routes publiques** : Les routes telles que `api/missions/browse` et `api/missions/match` permettent de naviguer et de matcher les missions sans exposer la clé API au navigateur.
- **Routes de quiz** : Les étapes du quiz sont organisées en un flow conditionnel, avec des routes spécifiques pour chaque étape.
- **Pages légales et informatives** : Incluent des routes pour le plan du site, l'accessibilité, les mentions légales, et la politique de confidentialité.

### Configuration et Services

- **Configuration** : Les variables de configuration incluent des paramètres pour l'URL de l'API, l'environnement, et les clés pour les services tiers comme Sentry et PostHog.
- **Services de tracking** : Utilisation de PostHog pour le tracking en production, avec un fallback local en développement.

## Sources

- `plateform/app/routes.ts`
- `plateform/app/routes/_index.tsx`
- `plateform/app/services/config.ts`
- `plateform/app/components/landing/how-it-works.tsx`
- `plateform/app/components/layout/header.tsx`

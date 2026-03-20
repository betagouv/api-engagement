---
description: Présentation de l'API Engagement et de ses cas d'usage
---

# Introduction

L'API Engagement permet aux organisations partenaires de **publier et diffuser des missions bénévoles et civiques** sur la plateforme [api.api-engagement.beta.gouv.fr](https://api.api-engagement.beta.gouv.fr).

## À qui s'adresse cette API ?

L'API s'adresse à deux types de partenaires :

**Partenaires annonceurs** — organisations qui créent et gèrent des missions bénévoles. Ils utilisent l'API pour :

- Publier et mettre à jour leurs missions
- Supprimer des missions expirées
- Suivre l'engagement généré (clics, candidatures)

**Partenaires diffuseurs** — plateformes qui affichent des missions issues de l'API Engagement à leurs utilisateurs. Ils utilisent l'API pour :

- Rechercher et filtrer des missions par localisation, domaine, organisation
- Récupérer le détail d'une mission
- Consulter les organisations et les partenaires disponibles

## URL de base

### Production

```
https://api.api-engagement.beta.gouv.fr
```

### Bac à sable

Un environnement bac à sable est disponible pour vous permettre de tester votre intégration avec des jeux de données de test. Rapprochez-vous de votre chargé de déploiement pour en demander l'accès.

```
https://api.bac-a-sable.api-engagement.beta.gouv.fr
```

Toutes les requêtes doivent utiliser HTTPS.

## Spec OpenAPI

La spécification complète de l'API est disponible au format OpenAPI 3.0 :

```
https://raw.githubusercontent.com/betagouv/api-engagement/main/api/docs/openapi.yaml
```

Vous pouvez l'importer directement dans [Postman](https://learning.postman.com/docs/integrations/available-integrations/working-with-openAPI/), [Insomnia](https://docs.insomnia.rest/insomnia/import-export-data) ou tout autre client HTTP compatible OpenAPI.

## Authentification

Tous les endpoints nécessitent une clé API. Consultez la section [Authentification](authentification.md) pour les détails.

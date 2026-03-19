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

## Versions de l'API

| Version | Type | Usage |
|---|---|---|
| **v0** | Lecture seule | Recherche et consultation de missions, organisations, partenaires diffuseurs |
| **v2** | Lecture / Écriture | CRUD missions, suivi des activités (impressions, clics, candidatures) |

## URL de base

```
https://api.api-engagement.beta.gouv.fr
```

Toutes les requêtes doivent utiliser HTTPS.

## Authentification

Tous les endpoints nécessitent une clé API. Consultez la section [Authentification](authentification.md) pour les détails.

# Instructions agent (API Engagement / `packages`)

Ce fichier décrit les conventions communes aux packages workspace sous `packages/`. Les règles globales restent définies dans l’`AGENTS.md` racine ; les sous-dossiers peuvent préciser leurs propres règles.

## Vue d’ensemble

`packages/` contient les briques TypeScript partagées entre l’API et les fronts :

- `dto/` : contrats de données publics entre `api/`, `plateform/` et autres clients.
- `taxonomy/` : source de vérité des taxonomies, clés de valeurs et helpers runtime associés.

Ces packages doivent rester légers : pas de dépendance runtime applicative, pas d’accès réseau, pas de dépendance à Express, React, Prisma ou au navigateur.

## Périmètre

En plus des exclusions racine, ne pas éditer/committer directement les `dist/` des packages. Ce sont des sorties de build TypeScript.

## Conventions

- Préserver des exports publics stables depuis `src/index.ts`.
- Éviter les imports croisés vers `api/`, `app/`, `plateform/`, `widget/` ou `analytics/`.
- Quand un type ou une clé partagée change, vérifier les consommateurs directs dans `api/` et `plateform/`.
- Privilégier des types et fonctions purs, déterministes et faciles à tester.
- Une rupture de contrat partagé doit être volontaire : adapter les producteurs et consommateurs dans la même PR.

## Commandes

Depuis la racine :

- DTO : `npm --workspace=@engagement/dto run build`
- Taxonomy : `npm --workspace=@engagement/taxonomy run build`

Les packages n’ont pas de script de test dédié pour l’instant ; si une logique runtime significative est ajoutée, ajouter aussi une stratégie de test ciblée.

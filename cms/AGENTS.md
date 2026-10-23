# Instructions agent (API Engagement / `cms`)

Ce fichier décrit uniquement les conventions spécifiques à `cms/`. Les règles globales (langue, git, sécurité, PR) restent définies dans l'`AGENTS.md` à la racine du dépôt.

## Rôle

CMS headless **Strapi 5 (Community)** + Postgres dédié, pour les landings et pages éditoriales de `plateform/`. Projet Node **autonome** : pas un workspace npm racine (Strapi épingle ses propres dépendances), avec son `package-lock.json`. Déployé sur Scaleway via `terraform/cms.tf` (désactivé par défaut, cf. `README.md`).

## Périmètre et fichiers à ne pas modifier

En plus des exclusions racine, ne pas éditer/committer `dist/`, `build/`, `.strapi/`, `.tmp/`, `types/generated/` (générés) ni `public/uploads/` (médias).

## Structure

- `config/*.ts` : serveur (proxy/URL publique), base (SSL), admin (dont la **preview** vers plateform), middlewares (CSP), plugins (médias sur Object Storage quand `CMS_MEDIA_BUCKET` est défini). Secrets via variables d'environnement (valeurs de dev locales dans `docker-compose.yml`).
- `src/api/landing-page/` : content-type `landing-page` (brouillon/publié) + routes/contrôleur/service par défaut.
- `src/components/blocks/` : les blocs de la zone dynamique `blocks` ; `src/components/shared/` : sous-composants réutilisables.
- `Dockerfile` (dev) et `Dockerfile.production` (image déployée : build, non-root, port 8080).
- `scripts/seed-chacun-pour-tous.ts` : seed de dev (recrée la landing et le jeton de lecture de plateform). Jetable.

## Contrat avec plateform

- Les schémas JSON de `src/**` sont la **source de vérité** du contenu.
- Les types lus par plateform vivent dans `packages/dto/src/resources/landing-page.ts` : tout changement de bloc ou de champ doit y être répercuté **dans la même PR**.
- Rendu côté plateform : `plateform/app/components/landings/blocks/index.tsx` (registre bloc → composant) et `plateform/app/services/cms.server.ts` (requête et `POPULATE` par bloc).

## Conventions

- TypeScript (TS 5.9, version embarquée par Strapi, pas la 6.0 du reste du dépôt), ESLint et Prettier alignés sur le reste du dépôt (config Prettier racine, `printWidth: 180`).
- Ajouter un bloc : schéma JSON + entrée dans `landing-page/schema.json` → type dans `@engagement/dto` → `POPULATE` → cas dans le registre plateform (voir `README.md`).
- Textes éditoriaux : texte brut avec micro-balisage (`==surlignage==`, `[libellé](/chemin)`), jamais de HTML.
- Scope de commit : `cms`.

## Commandes

Depuis `cms/` (ou dans le conteneur : `docker compose exec cms npm run <script>`) :

- Développement : `npm run dev` (admin sur `http://localhost:1337/admin`)
- Typecheck : `npm run typecheck` (génère les types Strapi puis `tsc`)
- Lint : `npm run lint`
- Format : `npm run prettier`
- Seed : `npm run seed`

Strapi redémarre à chaque modification de fichier dans `cms/` (mode `develop`).

# CMS (POC Strapi)

CMS headless (Strapi 5, Community, Postgres) pour les landings et pages éditoriales de `plateform/`. **POC local** : pas de Terraform ni de déploiement.

## Démarrage

```bash
docker compose up -d cms        # Strapi + Postgres, admin sur http://localhost:1337/admin (1er démarrage : build des images)
docker compose exec cms npm run seed   # recrée la landing « chacun-pour-tous » + le jeton de lecture de plateform
```

À la première visite de l'admin, créer un compte administrateur (local).

Côté `plateform` (hors Docker), lancer avec :

```bash
CMS_URL=http://localhost:1337 CMS_API_TOKEN=dev-cms-read-token CMS_PREVIEW_SECRET=dev-preview-secret npm --workspace=plateform run dev
```

Page rendue : `http://localhost:<port>/cms/chacun-pour-tous` (à comparer avec `/chacun-pour-tous`, la version en code).
Les valeurs `dev-*` sont des secrets de dev local, définis dans `docker-compose.yml`.

## Modèle de contenu

- `landing-page` (brouillon / publié) : titre, slug, SEO (`seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `noindex`) et une **zone dynamique `blocks`**.
- Blocs (`src/components/blocks/`) : `hero`, `missions`, `etapes`, `benefits` (bénéfices + newsletter), `cards`, `stories`, `faq`, `partners`.
- Sous-composants réutilisables : `src/components/shared/`.
- Textes : `==mot==` surligne, `[libellé](/chemin)` crée un lien, un retour à la ligne est conservé.

## Ajouter un bloc

1. Schéma JSON dans `src/components/blocks/` + l'ajouter à `blocks` dans `landing-page/schema.json`.
2. Type dans `packages/dto/src/resources/landing-page.ts`, et `POPULATE` dans `plateform/app/services/cms.server.ts` si le bloc a des sous-composants ou médias.
3. Cas dans `plateform/app/components/landings/blocks/index.tsx`.

Conventions et commandes : voir `AGENTS.md`. Si les dépendances changent, recréer le conteneur avec `docker compose up -d -V --force-recreate cms` (le volume `node_modules` est anonyme).

## Preview

Bouton « Preview » de l'admin → `plateform` `/cms/:slug?preview=<secret>&status=draft` : lit le brouillon (jeton + secret requis), `no-store`, `noindex`. Sans secret valide, seul le contenu publié est servi.
La preview « live » côte à côte (iframe) est une fonctionnalité payante de Strapi ; seule la preview par onglet est utilisée ici.

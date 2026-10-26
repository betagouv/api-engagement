# CMS (POC Strapi)

CMS headless (Strapi 5, Community, Postgres) pour les pages de `plateform/` (landings, pages éditoriales, blog). Local via Docker Compose ; déploiement sur Scaleway décrit plus bas.

## Démarrage

```bash
docker compose up -d cms        # Strapi + Postgres, admin sur http://localhost:1337/admin (1er démarrage : build des images)
docker compose exec cms npm run seed   # recrée la landing « chacun-pour-tous », une page d'exemple, le blog (10 articles), la navigation du footer + le jeton de lecture de plateform
```

À la première visite de l'admin, créer un compte administrateur (local).

Côté `plateform` (hors Docker), lancer avec :

```bash
CMS_URL=http://localhost:1337 CMS_API_TOKEN=dev-cms-read-token CMS_PREVIEW_SECRET=dev-preview-secret npm --workspace=plateform run dev
```

Page rendue : `http://localhost:<port>/cms/chacun-pour-tous` (à comparer avec `/chacun-pour-tous`, la version en code).
Les valeurs `dev-*` sont des secrets de dev local, définis dans `docker-compose.yml`.

## Modèle de contenu

- `page` (brouillon / publié) : titre (h1 de la page, sauf si un bloc `hero` le porte), slug, SEO (`seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `noindex`) et une **zone dynamique `blocks`**. Une landing est simplement une page qui utilise des blocs de campagne.
- `article` (brouillon / publié) : blog. Titre, slug, résumé, couverture, date de publication, auteur, catégorie, SEO et des blocs (`rich-text`, `image`, `missions`). `category` : nom + slug. Rendu sur `/blog` (liste paginée, filtre `?categorie=`) et `/blog/:slug` (JSON-LD `Article`, image de partage = couverture).
- `navigation` (single type, brouillon / publié) : section du pied de page (titre + liens). Chaque lien pointe vers une **page du CMS** (le lien suit son adresse et disparaît si elle est dépubliée) ou vers une URL libre (chemin interne ou adresse externe, qui s'ouvre dans un nouvel onglet). Sans navigation publiée ou sans CMS, le footer garde ses liens par défaut.
- Blocs génériques : `rich-text` (titre de section + texte riche : titres, paragraphes, listes, liens, citations, images), `image` (image + légende).
- Blocs « tout faits » : `hero`, `missions`, `etapes`, `benefits` (bénéfices + newsletter), `cards`, `stories`, `faq`, `partners` (`src/components/blocks/`).
- Sous-composants réutilisables : `src/components/shared/`.
- Champs texte des blocs « tout faits » : `==mot==` surligne, `[libellé](/chemin)` crée un lien, un retour à la ligne est conservé.
- Texte riche (`rich-text`) : éditeur « Blocks » de Strapi (sans tableaux). « Titre 1 » donne un h2 (le h1 est le titre de la page), « Titre 2 » un h3, etc. Le texte alternatif des images se renseigne dans la médiathèque ; sans lui, l'image est décorative.

## Ajouter un bloc

1. Schéma JSON dans `src/components/blocks/` + l'ajouter à `blocks` dans `page/schema.json`.
2. Type dans `packages/dto/src/resources/page.ts`, et `POPULATE` dans `plateform/app/services/cms.server.ts` si le bloc a des sous-composants ou médias.
3. Cas dans `plateform/app/components/cms/index.tsx`.

Conventions et commandes : voir `AGENTS.md`. Si les dépendances changent, recréer le conteneur avec `docker compose up -d -V --force-recreate cms` (le volume `node_modules` est anonyme).

## Sitemap

`/sitemap.xml` fusionne les pages fixes de plateform (`routes/sitemap.xml.ts`) et, depuis le CMS, les pages et articles **publiés et non `noindex`** (`lastmod` = date de dernière modification) ; `/blog` y figure dès qu'un article est publié. Le CMS indisponible n'empêche jamais le sitemap de se générer (pages fixes seules).

## Preview

Bouton « Preview » de l'admin → `plateform` `/cms/:slug` (pages) ou `/blog/:slug` (articles) avec `?preview=<secret>&status=draft` : lit le brouillon (jeton + secret requis), `no-store`, `noindex`. Sans secret valide, seul le contenu publié est servi.
La preview « live » côte à côte (iframe) est une fonctionnalité payante de Strapi ; seule la preview par onglet est utilisée ici.

## Déploiement (Scaleway)

Infra dans `terraform/cms.tf` (conteneur `<workspace>-cms`, bucket Object Storage `api-engagement-cms-media-<workspace>`, domaine, variables d'environnement de plateform). Image `cms` construite par `docker-build-push.yml` avec `cms/Dockerfile.production` (build de l'admin, exécution non-root, port 8080, santé sur `/_health`).

Le CMS est **désactivé par défaut** (`enable_cms = false` dans `terraform/envs/*.tfvars`) : tant que les prérequis ne sont pas en place, le plan Terraform ne change pas. En production Strapi charge ses schémas depuis le code (le Content-Type Builder est désactivé) : tout changement de modèle passe par une PR.

### Mise en service d'un environnement (staging d'abord)

1. **Base PostgreSQL dédiée** : créer une base `cms` et un utilisateur propre sur l'instance RDB, joignables via le Private Network (comme la base core, créée hors Terraform).
2. **Secret `<workspace>-secret`** (Secret Manager) : ajouter les clés `CMS_APP_KEYS` (4 valeurs séparées par des virgules), `CMS_ADMIN_JWT_SECRET`, `CMS_API_TOKEN_SALT`, `CMS_TRANSFER_TOKEN_SALT`, `CMS_ENCRYPTION_KEY`, `CMS_JWT_SECRET`, `CMS_PREVIEW_SECRET` (valeurs aléatoires, ex. `openssl rand -base64 32`) et `CMS_DATABASE_HOST`, `CMS_DATABASE_PORT`, `CMS_DATABASE_NAME`, `CMS_DATABASE_USERNAME`, `CMS_DATABASE_PASSWORD`. Le plan échoue avec un message explicite si une clé manque.
3. **Activer** : `enable_cms = true` dans `terraform/envs/<env>.tfvars` (avec `cms_hostname = ""` pour un premier déploiement sur le domaine Scaleway), puis merge : le pipeline construit l'image et applique Terraform.
4. **DNS** : créer le CNAME du `cms_hostname` vers le domaine du conteneur (`<workspace>-cms`, visible dans la console), puis renseigner `cms_hostname` et redéployer pour attacher le domaine.
5. **Premier administrateur** : le formulaire de `/admin` crée le super-admin au premier accès. Le faire **immédiatement** après le déploiement (tant qu'aucun admin n'existe, n'importe qui joignant l'URL peut le créer).
6. **Jeton de lecture de plateform** : Settings → API Tokens → type _Read-only_ ; copier sa valeur dans la clé `PLATEFORM_CMS_API_TOKEN` du secret, puis relancer le déploiement (plateform lit `CMS_URL`, `CMS_API_TOKEN` et `CMS_PREVIEW_SECRET`).
7. **Reprise du contenu** : Settings → Transfer Tokens (accès _push_) sur le CMS déployé, puis depuis le CMS local :

   ```bash
   docker compose exec cms npx strapi transfer --to https://<cms_hostname>/admin --to-token <transfer-token> --only content,files
   ```

   Les médias sont envoyés dans le bucket de l'environnement. Vérifier ensuite `https://<plateform>/cms/chacun-pour-tous` et la preview depuis l'admin.

Production : mêmes étapes, après validation en staging.

Plateform lit le contenu publié avec un cache mémoire de 60 s et reste servi avec la dernière version connue si le CMS est indisponible ; sans `CMS_API_TOKEN`, les landings CMS répondent 404.

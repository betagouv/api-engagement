# CMS (Strapi)

CMS headless (Strapi 5, Community, Postgres) pour construire les **landing pages** de `plateform/` à partir de blocs, sans passer par le code. Local via Docker Compose ; déploiement sur Scaleway décrit plus bas.

## Démarrage

```bash
docker compose up -d cms   # Strapi + Postgres, admin sur http://localhost:1337/admin (1er démarrage : build des images)
```

1. À la première visite de l'admin, créer un compte administrateur (local).
2. Créer le contenu dans l'interface : _Content Manager_ → **Page**.
3. Pour que `plateform` lise le CMS : _Settings_ → _API Tokens_ → créer un jeton de type _Read-only_, puis le fournir à plateform (`CMS_API_TOKEN`, par exemple dans `plateform/.env`).

Côté `plateform` (hors Docker, Node ≥ 22.22) :

```bash
cd plateform && CMS_URL=http://localhost:1337 CMS_API_TOKEN=<jeton> npx react-router dev
```

Une page publiée avec le slug `mon-slug` est rendue sur `/cms/mon-slug`.

## Modèle de contenu

- `page` (brouillon / publié) : titre (h1 de la page, sauf si un bloc `hero` le porte), slug, SEO (`seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `noindex`) et une **zone dynamique `blocks`**. Une landing est une page qui utilise des blocs de campagne.
- **`src/components/blocks/`** : les sections qu'un éditeur ajoute à une page (les seuls composants proposés dans la zone `blocks`).
  - Blocs génériques : `rich-text` (titre de section + texte riche : titres, paragraphes, listes, liens, citations, images) et `image` (image + légende).
  - Blocs « tout faits » : `hero` (image uploadée et sélecteur de couleur ; la couleur est ignorée en thème sombre), `missions`, `etapes`, `benefits` (bénéfices + newsletter), `cards`, `stories`, `faq`, `partners`.
- **`src/components/items/`** : les éléments répétables **à l'intérieur d'un bloc** (une carte, une étape, un partenaire…). Ils ne s'ajoutent jamais seuls à une page.

  | Bloc       | Éléments             |
  | ---------- | -------------------- |
  | `etapes`   | `items.etape`        |
  | `benefits` | `items.benefit`      |
  | `cards`    | `items.card`         |
  | `stories`  | `items.story`        |
  | `faq`      | `items.question`     |
  | `partners` | `items.partner`      |
  | `missions` | `items.mission-slot` |

- Champs texte des blocs « tout faits » : `==mot==` surligne, `[libellé](/chemin)` crée un lien, un retour à la ligne est conservé.
- Texte riche (`rich-text`) : éditeur « Blocks » de Strapi (sans tableaux). « Titre 1 » donne un h2 (le h1 est le titre de la page), « Titre 2 » un h3, etc. Le texte alternatif des images se renseigne dans la médiathèque ; sans lui, l'image est décorative.

## Ajouter un bloc

1. Schéma JSON dans `src/components/blocks/` (et, s'il contient une liste, son élément dans `src/components/items/`) + l'ajouter à `blocks` dans `src/api/page/content-types/page/schema.json`.
2. Type dans `packages/dto/src/resources/page.ts`, et `POPULATE` dans `plateform/app/services/cms.server.ts` si le bloc a des éléments ou des médias.
3. Cas dans `plateform/app/components/cms/index.tsx`.

Conventions et commandes : voir `AGENTS.md`. Si les dépendances changent, recréer le conteneur avec `docker compose up -d -V --force-recreate cms` (le volume `node_modules` est anonyme).

## Publication

Il n'y a **pas de preview** : plateform ne lit que le contenu publié. Une page publiée est visible sur `/cms/<slug>` après au plus 60 s (cache de plateform). Tant qu'elle n'est pas prête, la laisser en brouillon, ou la publier avec `noindex` pour ne pas l'exposer aux moteurs de recherche.

## Déploiement (Scaleway)

Infra dans `terraform/cms.tf` (conteneur `<workspace>-cms`, bucket Object Storage `api-engagement-cms-media-<workspace>`, domaine, variables d'environnement de plateform). Image `cms` construite par `docker-build-push.yml` avec `cms/Dockerfile.production` (build de l'admin, exécution non-root, port 8080, santé sur `/_health`).

Le CMS est **désactivé par défaut** (`enable_cms = false` dans `terraform/envs/*.tfvars`) : tant que les prérequis ne sont pas en place, le plan Terraform ne change pas. En production Strapi charge ses schémas depuis le code (le Content-Type Builder est désactivé) : tout changement de modèle passe par une PR.

### Mise en service d'un environnement (staging d'abord)

1. **Base PostgreSQL dédiée** : créer une base `cms` et un utilisateur propre sur l'instance RDB, joignables via le Private Network (comme la base core, créée hors Terraform).
2. **Secret `<workspace>-secret`** (Secret Manager) : ajouter les clés `CMS_APP_KEYS` (4 valeurs séparées par des virgules), `CMS_ADMIN_JWT_SECRET`, `CMS_API_TOKEN_SALT`, `CMS_TRANSFER_TOKEN_SALT`, `CMS_ENCRYPTION_KEY`, `CMS_JWT_SECRET` (valeurs aléatoires, ex. `openssl rand -base64 32`) et `CMS_DATABASE_HOST`, `CMS_DATABASE_PORT`, `CMS_DATABASE_NAME`, `CMS_DATABASE_USERNAME`, `CMS_DATABASE_PASSWORD`. Le plan échoue avec un message explicite si une clé manque.
3. **Activer** : `enable_cms = true` dans `terraform/envs/<env>.tfvars` (avec `cms_hostname = ""` pour un premier déploiement sur le domaine Scaleway), puis merge : le pipeline construit l'image et applique Terraform.
4. **DNS** : créer le CNAME du `cms_hostname` vers le domaine du conteneur (`<workspace>-cms`, visible dans la console), puis renseigner `cms_hostname` et redéployer pour attacher le domaine.
5. **Premier administrateur** : le formulaire de `/admin` crée le super-admin au premier accès. Le faire **immédiatement** après le déploiement (tant qu'aucun admin n'existe, n'importe qui joignant l'URL peut le créer).
6. **Jeton de lecture de plateform** : _Settings_ → _API Tokens_ → type _Read-only_ ; copier sa valeur dans la clé `PLATEFORM_CMS_API_TOKEN` du secret, puis relancer le déploiement (plateform lit `CMS_URL` et `CMS_API_TOKEN`).
7. **Contenu** : créer les pages dans l'admin, puis vérifier le rendu sur `https://<plateform>/cms/<slug>`.

Production : mêmes étapes, après validation en staging.

Plateform lit le contenu publié avec un cache mémoire de 60 s et reste servi avec la dernière version connue si le CMS est indisponible ; sans `CMS_API_TOKEN`, les pages CMS répondent 404.

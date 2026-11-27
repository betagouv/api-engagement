# CMS (Strapi)

CMS headless (Strapi 5, Community, Postgres) pour construire les **landing pages** de `plateform/` à partir de blocs, sans passer par le code. Local via Docker Compose (Postgres dédié, `DATABASE_URL`) ; déploiement sur Scaleway décrit plus bas.

## Démarrage

```bash
docker compose up -d cms                # Strapi + Postgres, admin sur http://localhost:1337/admin (1er démarrage : build des images)
docker compose exec cms npm run seed          # dev uniquement : jeton de lecture de plateform
docker compose exec cms npm run seed:pages    # dev uniquement : pages décrites dans cms/seed/pages/
```

À la première visite de l'admin, créer un compte administrateur (local). Le contenu se crée ensuite dans l'interface : _Content Manager_ → **Page**.

Le **seed** (`cms/scripts/seed.ts`) crée le jeton de lecture de plateform, de valeur fixe `dev-cms-read-token` (variable `CMS_API_TOKEN` du conteneur `cms`, hachée par Strapi), et seulement en développement local (il refuse de tourner en production).

Pour ajouter une page, passer par le **seed des pages** (`cms/scripts/seed-pages.ts`, dev uniquement lui aussi). Il recrée chaque page décrite dans `cms/seed/pages/` (un fichier JSON par page, au format de l'API : `title`, `slug`, `collection` (nom d'une collection de `cms/seed/collections.json`, créée par `npm run seed`), champs SEO, `blocks` avec leur `__component`). Un média s'écrit `{ "upload": "logo/jva-logo.png", "alternativeText": "…" }`, chemin relatif à `cms/seed/images/`. Relancer le seed **écrase** les pages concernées ; `npm run seed:pages -- <slug>` n'en recrée qu'une.

Pour ajouter une page de dev : créer `cms/seed/pages/<slug>.json` (s'inspirer de `trouve-ta-caserne.json`), déposer ses images dans `cms/seed/images/`, puis lancer `npm run seed:pages`.

### Envoyer une page du seed en staging ou en production

`seed-pages.ts` ne tourne qu'en local (il passe par la base). Pour un CMS déployé, `cms/scripts/seed-remote.ts` envoie les mêmes JSON par l'API REST :

1. Dans l'admin de l'environnement : _Settings_ → _API Tokens_ → **Create new API Token**, type **Full access**, durée **7 days**.
2. Depuis `cms/`, une ou plusieurs pages par slug, ou toutes sans slug (Node ≥ 22.18, sans Docker ni `npm install` : le script n'a aucune dépendance) :

   ```bash
   CMS_REMOTE_URL=https://<cms-staging> CMS_REMOTE_TOKEN=<jeton> npm run seed:remote -- sport education
   ```

   Les deux variables peuvent aussi être mises dans `cms/.env`, lu par le script ; celles passées en ligne de commande l'emportent.

3. Supprimer le jeton dans l'admin.

`seed:remote` crée d'abord les collections manquantes, puis classe les pages qu'il envoie.

Une page dont le slug existe déjà est **ignorée** : elle a pu être retouchée dans l'admin. Ajouter `--replace` pour l'écraser (elle est supprimée puis recréée, publiée). Les images sont réutilisées si un média du même nom existe déjà dans la médiathèque : renommer le fichier pour forcer l'envoi d'une nouvelle version. Les composants utilisés par la page doivent déjà être déployés sur l'environnement visé.

Compte admin perdu : `docker compose exec cms npx strapi admin:list-users` pour retrouver l'email, puis `docker compose exec cms npx strapi admin:reset-user-password --email <email>`.

Côté `plateform` (hors Docker, Node ≥ 22.22) :

```bash
cd plateform && CMS_URL=http://localhost:1337 CMS_API_TOKEN=dev-cms-read-token npx react-router dev
```

La page du seed est rendue sur `/chacun-pour-tous` (la landing n'existe plus en code, le CMS est la seule source). Plus généralement, une page publiée avec le slug `mon-slug` est rendue sur `/mon-slug` (un `/` est permis : `dispositif/service-civique`) ; le premier segment ne peut pas être celui d'une route existante (`cms/src/api/page/reserved-slugs.ts`). Hors seed, un jeton se crée dans l'admin : _Settings_ → _API Tokens_ → type _Read-only_.

## Modèle de contenu

- `page` (brouillon / publié) : titre (h1 de la page, sauf si un bloc `hero` le porte), slug, SEO (`seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `noindex`), libellé des boutons « quiz » (`ctaLabel`, ex. « Trouvez votre mission » pour une page au vouvoiement ; vide : libellés par défaut), source des inscriptions à la newsletter (`signupSource`, pour la carte d'alertes et les blocs `benefits` et `newsletter` ; vide : `cms_newsletter`) et une **zone dynamique `blocks`**. Une landing est une page qui utilise des blocs de campagne.
- `collection` : classement des pages (une collection au plus par page), pour filtrer la liste des pages de l'admin (bouton « Filtres » › `collection`). Sans effet sur le site ; non historisée. `npm run seed` (dev) et `seed:remote` créent les collections de base. Les rôles éditeurs doivent recevoir leurs droits sur ce type (Paramètres › Rôles).
- **`src/components/blocks/`** : les sections qu'un éditeur ajoute à une page (les seuls composants proposés dans la zone `blocks`).
  - Blocs génériques : `rich-text` (titre de section + texte riche : titres, paragraphes, listes, liens, citations, images) et `image` (image + légende).
  - Blocs « tout faits » : `hero`, `missions`, `etapes`, `benefits` (bénéfices + newsletter), `cards`, `stories`, `testimonials`, `faq`, `accordion` (FAQ en accordéon), `partners`.
- **`src/components/items/`** : les éléments répétables **à l'intérieur d'un bloc** (une carte, une étape, un partenaire…). Ils ne s'ajoutent jamais seuls à une page.

  | Bloc           | Éléments               |
  | -------------- | ---------------------- |
  | `hero`         | `items.hero-tag`       |
  | `etapes`       | `items.etape`          |
  | `benefits`     | `items.benefit`        |
  | `cards`        | `items.card`           |
  | `stories`      | `items.story`          |
  | `testimonials` | `items.testimonial`    |
  | `faq`          | `items.question`       |
  | `accordion`    | `items.accordion-item` |
  | `partners`     | `items.partner`        |
  | `missions`     | `items.mission-slot`   |

- Bloc `partners` : chaque partenaire se choisit dans une liste (`items.partner.partner`) ; son nom, son logo et son texte par défaut vivent dans `plateform/app/config/cms-partners.ts` (un nouveau partenaire s'ajoute là **et** dans l'enum du schéma). Le champ `description` remplace le texte par défaut sur la page (ex. vouvoiement).
- Bloc `missions-browser` : `prioriteActivites` et `prioriteDomaines` donnent la priorité, dans les premiers résultats seulement (sans filtre ni localisation du visiteur), aux missions ayant l'une de ces activités ou l'un de ces domaines, tous dispositifs confondus ; `alertCard` ajoute la carte d'inscription aux alertes en première page. Les textes de cette carte et du formulaire du bloc `benefits` sont en vouvoiement. Une nouvelle valeur de `signupSource` doit exister dans `SIGNUP_SOURCES` (`packages/dto`).
- Champs texte des blocs « tout faits » : `==mot==` surligne, `[libellé](/chemin)` crée un lien, un retour à la ligne est conservé.
- Texte riche (`rich-text`) : éditeur « Blocks » de Strapi (sans tableaux). « Titre 1 » donne un h2 (le h1 est le titre de la page), « Titre 2 » un h3, etc. Le texte alternatif des images se renseigne dans la médiathèque ; sans lui, l'image est décorative.

## Historique des pages

Un instantané du brouillon est enregistré dans `page-version` à chaque création, enregistrement ou publication d'une page (middleware du Document Service dans `src/history.ts`, 50 versions conservées par page, pas de doublon si rien n'a changé). Le panneau « Historique » de la page (`src/admin/components/page-history.tsx`) ouvre une modale qui liste les versions (regroupées par mois, version actuelle en surbrillance, statut Brouillon/Publiée, filtre « Versions publiées », pastille par auteur, défilement) et restaure l'une d'elles dans le brouillon ; la publication reste manuelle.

`page-version` n'a pas de route d'API : elle n'est lisible que depuis l'admin. Donner aux rôles éditeurs uniquement le droit de **lecture** sur ce type (Paramètres › Rôles), sinon ils pourraient modifier les instantanés.

## Ajouter un bloc

1. Schéma JSON dans `src/components/blocks/` (et, s'il contient une liste, son élément dans `src/components/items/`) + l'ajouter à `blocks` dans `src/api/page/content-types/page/schema.json`.
2. Côté plateform : type dans `plateform/app/types/cms.ts`, `POPULATE` dans `plateform/app/services/cms.server.ts` si le bloc a des éléments ou des médias, et cas dans le registre `plateform/app/components/cms/index.tsx`.

Conventions et commandes : voir `AGENTS.md`. Si les dépendances changent, recréer le conteneur avec `docker compose up -d -V --force-recreate cms` (le volume `node_modules` est anonyme).

## Publication

**Preview** : dans l'éditeur d'une page, le panneau « Aperçu » (preview native de Strapi) affiche le brouillon en cours d'édition, rendu par plateform sur `/<slug>?preview=<secret>` (non mis en cache, `noindex`). Il faut enregistrer pour rafraîchir l'aperçu. Elle repose sur `CMS_PREVIEW_SECRET`, identique côté CMS et plateform (secret Terraform `CMS_PREVIEW_SECRET` ; sans lui la preview est désactivée). Le handler est dans `config/admin.ts`.

Hors preview, plateform ne lit que le contenu publié : une page publiée est visible sur `/<slug>` après au plus 60 s (cache de plateform).

## Déploiement (Scaleway)

Infra dans `terraform/cms.tf` (conteneur `<workspace>-cms`, bucket Object Storage `api-engagement-cms-media-<workspace>`, domaine, variables d'environnement de plateform). Image `cms` construite par `docker-build-push.yml` avec `cms/Dockerfile.production` (build de l'admin, exécution non-root, port 8080, santé sur `/_health`).

Le CMS est **désactivé par défaut** (`enable_cms = false` dans `terraform/envs/*.tfvars`) : tant que les prérequis ne sont pas en place, le plan Terraform ne change pas. En production Strapi charge ses schémas depuis le code (le Content-Type Builder est désactivé) : tout changement de modèle passe par une PR.

### Mise en service d'un environnement (staging d'abord)

1. **Base et utilisateur dédiés** sur l'instance RDB existante (`core-staging` / `core-production`, déjà dans le Private Network), créés hors Terraform pour cloisonner le CMS de la base core. Avec un compte admin de l'instance :

   ```sql
   CREATE ROLE cms LOGIN PASSWORD '<mot-de-passe>';
   CREATE DATABASE cms OWNER cms;
   ```

   Vérifier que l'utilisateur `cms` n'a aucun droit sur la base core (`REVOKE CONNECT ON DATABASE <base-core> FROM PUBLIC` si besoin) et, côté Scaleway, qu'il est autorisé à se connecter (ACL de l'instance).

2. **Secret `<workspace>-secret`** (Secret Manager) : ajouter les clés `CMS_APP_KEYS` (4 valeurs séparées par des virgules), `CMS_ADMIN_JWT_SECRET`, `CMS_API_TOKEN_SALT`, `CMS_TRANSFER_TOKEN_SALT`, `CMS_ENCRYPTION_KEY`, `CMS_JWT_SECRET` (valeurs aléatoires, ex. `openssl rand -base64 32`) et `DATABASE_URL_CMS`, la chaîne de connexion à la base `cms` : `postgres://cms:<mot-de-passe>@<hôte-privé-rdb>:<port>/cms` (même hôte privé que `DATABASE_URL_CORE`, mot de passe encodé en URL s'il contient des caractères spéciaux, sans `sslmode` : le TLS est géré par `DATABASE_SSL` dans `terraform/cms.tf`). Le plan échoue avec un message explicite si une clé manque.
3. **DNS** (avant le déploiement) : créer le CNAME du `cms_hostname` vers le domaine du conteneur, prévisible car il suit celui des autres conteneurs de l'environnement : `<préfixe-du-namespace>-<workspace>-cms.functions.fnc.fr-par.scw.cloud` (ex. `stagingklpcfxvn-staging-cms.functions.fnc.fr-par.scw.cloud`, préfixe visible dans `scw container container list`). Scaleway refuse d'attacher le domaine tant que le CNAME n'existe pas.
4. **Activer** : `enable_cms = true` et `cms_hostname` renseigné dans `terraform/envs/<env>.tfvars`, puis merge : le pipeline construit l'image et applique Terraform.
5. **Premier administrateur** : le formulaire de `/admin` crée le super-admin au premier accès. Le faire **immédiatement** après le déploiement (tant qu'aucun admin n'existe, n'importe qui joignant l'URL peut le créer).
6. **Jeton de lecture de plateform** : _Settings_ → _API Tokens_ → type _Read-only_ ; copier sa valeur dans la clé `PLATEFORM_CMS_API_TOKEN` du secret, puis relancer le déploiement (plateform lit `CMS_URL` et `CMS_API_TOKEN`).
7. **Contenu** : créer les pages dans l'admin, puis vérifier le rendu sur `https://<plateform>/<slug>`.

Production : mêmes étapes, après validation en staging.

Plateform lit le contenu publié avec un cache mémoire de 60 s et reste servi avec la dernière version connue si le CMS est indisponible ; sans `CMS_API_TOKEN`, les pages CMS répondent 404.

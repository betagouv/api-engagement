# Functions

Scaleway Serverless Functions du projet. Pour l'instant une seule fonction :

- **sentry-webhook** — relais entre le Sentry self-hosted et Slack : reçoit le payload d'une alerte Sentry en `POST` (plugin legacy WebHooks ou intégration Sentry), le reformate et le poste via l'app Slack (`chat.postMessage`, même token que l'api). Une seule fonction pour tous les environnements : le channel est choisi selon l'`environment` de l'événement Sentry — staging → `SLACK_CHANNEL_ID_STAGING`, tout le reste → `SLACK_CHANNEL_ID_PRODUCTION` (le sandbox tourne avec `ENV=production`, il remonte donc dans le channel production).

## Structure

```
functions/
  src/
    functions/
      sentry-webhook/handler.ts     # Une fonction = un dossier avec un handler.ts (export handle)
```

## Déploiement (Terraform)

La fonction est déployée par Terraform (`terraform/functions.tf`) via le workflow `terraform-deploy.yml` :

1. La CI lance `npm --prefix functions run build` : esbuild bundle chaque `src/functions/<nom>/handler.ts` vers `terraform/build/<nom>/handler.mjs` (une seule commande, quel que soit le nombre de fonctions).
2. `terraform apply` zippe le bundle et crée/met à jour la fonction (namespace `functions`).

La fonction est déployée une seule fois, par le workspace qui active `enable_sentry_webhook = true` dans ses `tfvars` — aujourd'hui **staging**, pour pouvoir itérer dessus sans passer par un déploiement de production. Les autres workspaces la laissent à `false` (valeur par défaut).

Variables de la fonction :

- `SLACK_TOKEN` (secrète) — token de l'app Slack, repris du Secret Manager du workspace (`staging-secret`, le même que l'api).
- `SLACK_CHANNEL_ID_PRODUCTION` / `SLACK_CHANNEL_ID_STAGING` — ids des channels Slack, renseignés via `sentry_slack_channel_id_production` et `sentry_slack_channel_id_staging` dans `envs/staging.tfvars`.
- `DEBUG_PAYLOAD` — `"true"` pour logguer le payload Sentry brut (voir _Débugger_), piloté par `sentry_webhook_debug_payload`.
- `SENTRY_CLIENT_SECRET` (secrète) — Client Secret de la Custom Integration Sentry, repris de la clé du même nom dans le Secret Manager du workspace (`staging-secret`, le même que l'api). Vide tant que la clé n'existe pas : la vérification de signature est alors désactivée (voir _Protection_).

L'app Slack doit être invitée dans les channels (`/invite @NomDeLApp`).

Pour un `terraform plan`/`apply` local sur le workspace qui l'héberge, construire d'abord les bundles :

```bash
npm --prefix functions run build
```

## Développement

```bash
cd functions
npm install
npm run typecheck
```

## Protection

La fonction est publique (Sentry doit pouvoir la joindre) et se fait donc scanner par des bots. Trois filtres, appliqués dans cet ordre avant tout appel à Slack, chacun loguant une seule ligne `requête rejetée: ...` :

- **Signature Sentry** — quand `SENTRY_CLIENT_SECRET` est renseigné, la fonction recalcule le HMAC SHA256 du body brut avec ce secret et le compare à l'en-tête `Sentry-Hook-Signature` ; signature absente ou invalide, elle répond `401`. C'est le seul filtre qui authentifie l'expéditeur, mais il ne couvre que l'intégration Sentry : le plugin legacy ne signe rien.
- **Forme du payload** — la requête doit être un `POST`, du JSON, et contenir un événement Sentry (`event` pour le plugin legacy, `data.event` pour l'intégration). Une sonde type `{"query": "..."}` est écartée là.
- **Origine du payload** — au moins un des liens du payload (`url`, `event.web_url`, `event.url`) doit avoir pour origine `SENTRY_URL`, la constante en tête du handler (`https://sentry.incubateur.net`) : l'url est parsée et son origine comparée à l'identique, un host qui commence pareil (`sentry.incubateur.net.exemple.com`) ne passe pas. Si l'instance Sentry change d'url, c'est la seule ligne à modifier — sinon les alertes sont rejetées en `403`.

Les deux derniers filtres ne coûtent rien et couvrent la période où `SENTRY_CLIENT_SECRET` n'est pas renseigné (et le plugin legacy, qui ne peut pas signer), mais ils n'authentifient pas l'expéditeur : un payload forgé qui reprend la bonne forme et les bonnes urls passerait. Seule la signature protège vraiment.

Pour activer la vérification :

1. Récupérer le Client Secret de la Custom Integration dans Sentry (**Settings → Custom Integrations → l'intégration**).
2. L'ajouter sous la clé `SENTRY_CLIENT_SECRET` dans le Secret Manager du workspace qui héberge la fonction (`staging-secret`, le même que l'api).
3. Déployer (`terraform apply`).

Rien à changer côté Sentry : la signature voyage dans un en-tête ([HMAC SHA256 du body](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/)), les urls configurées restent les mêmes et le secret ne circule jamais. Pour revenir en arrière, vider la clé du Secret Manager et redéployer.

Attention en revanche au plugin legacy WebHooks : il ne signe rien, donc dès que `SENTRY_CLIENT_SECRET` est renseigné, les projets branchés dessus reçoivent `401` et leurs alertes n'arrivent plus dans Slack. Les basculer sur l'intégration Sentry avant d'activer la vérification.

## Brancher Sentry

L'URL de la fonction est la même pour tous les projets, production comprise (`terraform output sentry_webhook_endpoint` sur le workspace staging pour la retrouver). Deux branchements possibles, la fonction accepte les deux formats de payload :

- **Plugin legacy WebHooks** — pour chaque projet : **Settings → Legacy Integrations → WebHooks**, activer le plugin et renseigner l'URL, puis ajouter l'action « Send a notification via WebHooks » dans les **Alert rules** du projet. Le payload a les champs à la racine (`project_name`, `message`, `url`, `event`).
- **Intégration Sentry (Internal Integration)** — **Settings → Custom Integrations**, renseigner la Webhook URL, cocher **Alert Rule Action**, puis choisir l'intégration comme action dans les **Alert rules**. C'est le branchement utilisé aujourd'hui. Le payload est de la forme `{ action, data: { event, triggered_rule } }` : le nom du projet n'y est pas, il est déduit de l'url d'api de l'événement, et le lien vers l'issue vient de `web_url`.

Si le payload ne correspond à aucun des deux formats, rien n'est posté dans Slack : la fonction logue `requête rejetée: payload non reconnu` avec les clés reçues, visibles dans les logs de la fonction (Scaleway/Cockpit).

## Débugger

Tous les logs de la fonction sont préfixés `[sentry-webhook]` : dans Cockpit, filtrer là-dessus donne le déroulé complet d'une requête.

Un appel qui aboutit produit quatre lignes (une requête rejetée n'en produit qu'une, `requête rejetée: ...`) :

```
[sentry-webhook] requête POST (body: 4821 octets, base64: false)
[sentry-webhook] format: intégration Sentry (clés: action, installation, data, actor)
[sentry-webhook] event 8f3c… · projet api-engagement-api · env production · niveau error · titre "TypeError" · lien oui → channel C052V2UF918
[sentry-webhook] message posté dans C052V2UF918 (ts 1757856…) en 412 ms
```

Les cas d'échec sont logués avec la raison exacte : méthode refusée, signature absente ou invalide, JSON invalide, payload non reconnu (avec les clés reçues), configuration incomplète (quelle variable manque), et l'erreur renvoyée par Slack (`channel_not_found`, `not_in_channel`, `invalid_auth`…).

Pour voir le payload complet, passer `sentry_webhook_debug_payload = true` dans les tfvars du workspace (activé en staging) : la fonction logue alors le body brut, tronqué à 4 000 caractères. À garder désactivé en dehors d'une session de debug — la fonction relaie aussi les événements de production, dont le payload peut contenir des données personnelles.

## Notes

- Comme la fonction vit dans le workspace staging alors qu'elle relaie aussi les alertes de production, un déploiement staging cassé coupe les alertes prod : vérifier les logs de la fonction après une modification du handler.
- Ajouter une fonction = créer `src/functions/<nom>/handler.ts` (export `handle`) et une ressource `scaleway_function` dans `terraform/functions.tf`. Rien à toucher côté build : `npm run build` bundle tous les dossiers de `src/functions/`.

# Functions

Scaleway Serverless Functions du projet. Pour l'instant une seule fonction :

- **sentry-webhook** — relais entre le Sentry self-hosted et Slack : reçoit le payload du plugin legacy WebHooks de Sentry en `POST`, le reformate et le poste via l'app Slack (`chat.postMessage`, même token que l'api). Une seule fonction pour tous les environnements : le channel est choisi selon l'`environment` de l'événement Sentry — staging → `SLACK_CHANNEL_ID_STAGING`, tout le reste → `SLACK_CHANNEL_ID_PRODUCTION` (le sandbox tourne avec `ENV=production`, il remonte donc dans le channel production).

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

La fonction est déployée une seule fois, par le workspace production (`enable_sentry_webhook = true` dans `envs/production.tfvars`).

Variables de la fonction :

- `SLACK_TOKEN` (secrète) — token de l'app Slack, repris du Secret Manager (`production-secret`, le même que l'api).
- `SLACK_CHANNEL_ID_PRODUCTION` / `SLACK_CHANNEL_ID_STAGING` — ids des channels Slack, renseignés via `sentry_slack_channel_id_production` et `sentry_slack_channel_id_staging` dans `envs/production.tfvars`.

L'app Slack doit être invitée dans les channels (`/invite @NomDeLApp`).

Pour un `terraform plan`/`apply` local sur le workspace production, construire d'abord les bundles :

```bash
npm --prefix functions run build
```

## Développement

```bash
cd functions
npm install
npm run typecheck
```

## Brancher Sentry

Dans le Sentry self-hosted, pour chaque projet à notifier :

1. **Settings → Legacy Integrations → WebHooks** : activer le plugin et renseigner l'URL de la fonction, la même pour tous les projets (`terraform output sentry_webhook_endpoint` sur le workspace production pour la retrouver).
2. Dans les **Alert rules** du projet, ajouter l'action « Send a notification via WebHooks ».

## Notes

- La fonction est publique (Sentry doit pouvoir la joindre) et le plugin WebHooks ne signe pas ses requêtes : l'URL fait office de secret. Si besoin de durcir, ajouter un token partagé en variable de fonction.
- Ajouter une fonction = créer `src/functions/<nom>/handler.ts` (export `handle`) et une ressource `scaleway_function` dans `terraform/functions.tf`. Rien à toucher côté build : `npm run build` bundle tous les dossiers de `src/functions/`.

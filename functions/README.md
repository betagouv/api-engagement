# Functions

Scaleway Serverless Functions du projet. Pour l'instant une seule fonction :

- **sentry-webhook** — relais entre le Sentry self-hosted et Slack : reçoit le payload du plugin legacy WebHooks de Sentry en `POST`, le reformate et le poste via l'app Slack (`chat.postMessage`, même token que l'api) dans le channel indiqué par `SLACK_CHANNEL_ID`. Une fonction par workspace (staging, production, sandbox), chacune avec son channel — le sandbox pointe sur le même channel que la production.

## Structure

```
functions/
  src/
    functions/
      sentry-webhook/handler.ts     # Une fonction = un dossier avec un handler.ts (export handle)
```

## Déploiement (Terraform)

La fonction est déployée par Terraform (`terraform/functions.tf`) via le workflow `terraform-deploy.yml` :

1. La CI bundle le handler avec esbuild vers `terraform/build/sentry-webhook/handler.mjs`.
2. `terraform apply` zippe le bundle et crée/met à jour la fonction (namespace `functions`).

Chaque workspace déploie sa propre fonction (`enable_sentry_webhook = true` dans `envs/<workspace>.tfvars`).

Variables de la fonction :

- `SLACK_TOKEN` (secrète) — token de l'app Slack, repris du Secret Manager (`<workspace>-secret`, le même que l'api).
- `SLACK_CHANNEL_ID` — id du channel Slack, renseigné via `sentry_slack_channel_id` dans `envs/<workspace>.tfvars` (le sandbox utilise le même id que la production).

L'app Slack doit être invitée dans les channels (`/invite @NomDeLApp`).

Pour un `terraform plan`/`apply` local sur le workspace production, construire d'abord le bundle :

```bash
npx -y esbuild functions/src/functions/sentry-webhook/handler.ts --bundle --platform=node --format=esm --outfile=terraform/build/sentry-webhook/handler.mjs
```

## Développement

```bash
cd functions
npm install
npm run typecheck
```

## Brancher Sentry

Dans le Sentry self-hosted, pour chaque projet à notifier :

1. **Settings → Legacy Integrations → WebHooks** : activer le plugin et renseigner l'URL de la fonction correspondant à l'environnement du projet (`terraform output sentry_webhook_endpoint` sur le bon workspace pour la retrouver).
2. Dans les **Alert rules** du projet, ajouter l'action « Send a notification via WebHooks ».

## Notes

- La fonction est publique (Sentry doit pouvoir la joindre) et le plugin WebHooks ne signe pas ses requêtes : l'URL fait office de secret. Si besoin de durcir, ajouter un token partagé en variable de fonction.
- Ajouter une fonction = créer `src/functions/<nom>/handler.ts` (export `handle`), ajouter une ligne de build esbuild dans `terraform-deploy.yml` et une ressource `scaleway_function` dans `terraform/functions.tf`.

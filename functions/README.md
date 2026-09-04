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

La fonction est déployée une seule fois, par le workspace production : `terraform/locals.tf` la conditionne à `var.workspace == "production"`, il n'y a rien à activer dans les `tfvars`.

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

L'URL de la fonction est la même pour tous les projets (`terraform output sentry_webhook_endpoint` sur le workspace production pour la retrouver). Deux branchements possibles, la fonction accepte les deux formats de payload :

- **Plugin legacy WebHooks** — pour chaque projet : **Settings → Legacy Integrations → WebHooks**, activer le plugin et renseigner l'URL, puis ajouter l'action « Send a notification via WebHooks » dans les **Alert rules** du projet. Le payload a les champs à la racine (`project_name`, `message`, `url`, `event`).
- **Intégration Sentry (Internal Integration)** — **Settings → Custom Integrations**, renseigner la Webhook URL, cocher **Alert Rule Action**, puis choisir l'intégration comme action dans les **Alert rules**. Le payload est de la forme `{ action, data: { event, triggered_rule } }` : le nom du projet n'y est pas, il est déduit de l'url d'api de l'événement, et le lien vers l'issue vient de `web_url`.

Si le message Slack arrive avec un titre « Nouvel événement Sentry » et « Projet : ? », c'est que le payload reçu ne correspond à aucun des deux formats : la fonction logue alors les clés reçues (`Sentry webhook: payload inattendu`), visibles dans les logs de la fonction (Scaleway/Cockpit).

## Notes

- La fonction est publique (Sentry doit pouvoir la joindre) et le plugin WebHooks ne signe pas ses requêtes : l'URL fait office de secret. Si besoin de durcir, ajouter un token partagé en variable de fonction.
- Ajouter une fonction = créer `src/functions/<nom>/handler.ts` (export `handle`) et une ressource `scaleway_function` dans `terraform/functions.tf`. Rien à toucher côté build : `npm run build` bundle tous les dossiers de `src/functions/`.

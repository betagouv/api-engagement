# POC Keep (alerting)

Stack locale pour évaluer [Keep](https://github.com/keephq/keep) comme récepteur d'alertes (Metabase, Sentry, etc.). Local uniquement, ne pas déployer en l'état (secrets de POC en clair).

## Lancer

```bash
cd tools/keep
docker compose up -d
```

| Service | URL | Notes |
|---|---|---|
| UI Keep | http://localhost:3100 | login `keep` / `keep` (auth `DB`) |
| API Keep | http://localhost:8080 | `GET /healthcheck` |
| Mailpit (SMTP de test) | http://localhost:8025 | SMTP : `mailpit:1025` depuis Keep |

Le port 3000 est pris par `app/`, d'où l'UI sur 3100. Les télémétries PostHog/Sentry de Keep sont désactivées. Image épinglée en `0.54.3`.

## Envoyer une alerte de test

```bash
TOKEN=$(curl -s -X POST localhost:8080/signin -H 'content-type: application/json' \
  -d '{"username":"keep","password":"keep"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

curl -X POST localhost:8080/alerts/event -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"tracking-stopped","status":"firing","severity":"critical","description":"0 candidature sur 14 jours","labels":{"publisher_id":"123"},"fingerprint":"tracking:123"}'
```

## Workflows

Les workflows YAML sont dans `workflows/` (monté en lecture seule dans `/workflows`).

## Avancement du POC

Plan : voir la section « Scénarios » du plan d'origine ; le rapport final ira dans `docs/keep-poc.md`.

- [x] Socle : Keep + Postgres + websocket + Mailpit, auth DB, ingestion d'une alerte via l'API
- [x] S1 : alerte générique (webhook Metabase, notification du chargé de déploiement via `POST /alerts-poc/notify` + Brevo)
- [x] S2 : statut et write-back vers l'API (`POST /alerts-poc/status`)
- [ ] S3 : réponse par mail, Slack interactif
- [ ] S4 : alertes complexes (dédup, corrélation, escalade, multi-sources)
- [ ] S5 : exploitation, montée de version, export

## Mise en route des workflows (API Keep)

Les providers et workflows se créent par l'API (rejouable) ; voir les commandes ci-dessous. L'API (`api/`) doit tourner avec `ALERTS_WEBHOOK_TOKEN` et `ALERTS_BREVO_TEMPLATE_ID`.

- Provider webhook (headers au format `[{"key": "...", "value": "..."}]`) : `POST /providers/install` avec `provider_id=webhook`, `provider_name=api-notify|api-status`, `url=http://host.docker.internal:3002/alerts-poc/{notify|status}`.
- Workflow : `POST /workflows` en multipart (`-F file=@workflows/xxx.yml`).
- Volume `/state` : `docker compose exec -u root keep-backend chown -R 1000:1000 /state` après la première création.

## Constats (à reprendre dans docs/keep-poc.md)

- **Workflows YAML** : chargement par API, rejouable ; les erreurs de format (ex. headers) n'apparaissent qu'à l'exécution, dans les logs du run.
- **Changement de statut** : `only_on_change: status` fonctionne, mais deux changements rapprochés (< quelques secondes) donnent deux exécutions qui voient toutes le statut final. Pas d'historique fiable des états intermédiaires côté workflow.
- **Assignation** : `assignee` est un champ libre via `POST /alerts/enrich` (pas une relation vers un utilisateur, ni multi-valeur). À confirmer dans l'UI.
- **Secrets** : la réponse de `POST /providers/install` renvoie le header `Authorization` en clair.
- **Droits `/state`** : le volume doit appartenir à l'utilisateur `keep` (uid 1000), sinon l'installation d'un provider échoue.
- **Glue code** nécessaire côté API : `POST /alerts-poc/notify` (lookup + mail Brevo) et `POST /alerts-poc/status`.

## Déploiement Scaleway (Terraform)

Support dans [`terraform/keep.tf`](../../terraform/keep.tf), désactivé par défaut (`enable_keep = false`). Une seule instance pour tous les environnements, à activer dans un seul workspace (comme `enable_sentry_webhook`).

| Ressource | Détail |
|---|---|
| `scaleway_rdb_instance.keep` | PostgreSQL 16 managé (`DB-DEV-S`), sur le Private Network du workspace, sauvegardes activées |
| `scaleway_container.keep_backend` | Image upstream `keep-api` (ou image custom avec workflows). `min_scale = max_scale = 1` (le backend porte le scheduler des workflows), public (appelé par Metabase / sentry-webhook) |
| `scaleway_container.keep_frontend` | Image upstream `keep-ui`, scale-to-zero |
| `scaleway_container_domain.keep_{ui,api}` | Domaines custom, **obligatoires** quand `enable_keep` |

Pour activer (ex. dans `envs/staging.tfvars`) :

```hcl
enable_keep       = true
keep_hostname     = "keep.api-engagement-dev.fr"
keep_api_hostname = "keep-api.api-engagement-dev.fr"
alerts_brevo_template_id = "<id>"
```

Clés à ajouter au Secret Manager `<workspace>-secret` : `KEEP_DB_PASSWORD`, `KEEP_JWT_SECRET`, `KEEP_NEXTAUTH_SECRET`, `KEEP_DEFAULT_PASSWORD`, `ALERTS_WEBHOOK_TOKEN`.

Choix et limites :
- Secrets des providers en base (`SECRET_MANAGER_TYPE=DB`) : un conteneur n'a pas de disque persistant.
- Providers `api-notify` / `api-status` provisionnés par `KEEP_PROVIDERS` (token injecté depuis le Secret Manager) ; workflows par `KEEP_WORKFLOWS_DIRECTORY` via l'image du `Dockerfile` (`keep_backend_image`). Le build/push de cette image n'est pas dans la CI.
- Websocket Soketi non déployé (`PUSHER_DISABLED`) : l'UI Keep ne se rafraîchit pas en temps réel.
- Les images viennent du registre public de Keep (Google Artifact Registry) : à confirmer que Scaleway Containers sait les tirer, sinon les miroiter dans GHCR.
- Le compte `keep` de la base managée est l'utilisateur applicatif et administrateur (POC).
- Validé par `terraform validate` ; aucun `plan` exécuté (nécessite le Secret Manager et le backend d'état).

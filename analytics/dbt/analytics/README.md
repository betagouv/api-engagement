# Utiliser dbt pour l’analytics

Ce dossier contient tout ce qu’il faut pour exécuter et maintenir les modèles dbt qui alimentent l’entrepôt `analytics_raw`. L’objectif est de permettre à n’importe quel membre de l’équipe de lancer un run dbt, de comprendre où déclarer les variables d’environnement et comment empaqueter l’ensemble dans Docker/Terraform.

## Structure

```
analytics/dbt/analytics/
├── dbt_project.yml          # configuration du projet dbt
├── profiles.yml             # profil dbt (utilise les env vars)
├── macros/                  # macros personnalisées (schema, helpers…)
├── models/
│   ├── raw.yml              # documentation des sources
│   ├── staging/             # modèles staging (par type d’événement)
│   └── marts/               # tables finales (fct_accounts, etc.)
├── scripts/dbt-env.sh       # script helper pour lancer dbt en local
└── …
```

## Variables d’environnement

dbt lit ses paramètres de connexion dans `profiles.yml`:

| Variable                 | Description                                  |
| ------------------------ | -------------------------------------------- |
| `DATABASE_URL_ANALYTICS` | DSN Postgres complète (ex. `postgresql://…`) |
| `DBT_DB_HOST`            | Hôte, dérivé automatiquement si DSN présent  |
| `DBT_DB_PORT`            | Port (défaut `5432`)                         |
| `DBT_DB_USER`            | Utilisateur                                  |
| `DBT_DB_PASSWORD`        | Mot de passe                                 |
| `DBT_DB_NAME`            | Base ciblée                                  |

Le script `scripts/dbt-env.sh` charge `analytics/.env` (si présent), découpe automatiquement `DATABASE_URL_ANALYTICS` en variables `DBT_DB_*` puis lance dbt.

## Lancer dbt en local

1. Copier le fichier `.env.example` (si disponible) ou renseigner vos valeurs dans `analytics/.env` :

   ```env
   DATABASE_URL_ANALYTICS=postgresql://user:password@localhost:5431/analytics?sslmode=disable
   ```

2. Utiliser le script helper :

   ```bash
   analytics/scripts/dbt-env.sh \
     ls   # ou run / test / build
   ```

3. Pour un seul modèle :

   ```bash
   analytics/scripts/dbt-env.sh run --models stg_stat_event__clicks
   ```

## Intégration Docker / Terraform

- **Docker** : l’image `analytics/Dockerfile.production` copie ce dossier, installe dbt et pointe l’ENTRYPOINT vers `docker-entrypoint.sh`. Ce script exécute éventuellement `npm run db:migrate`, parse `DATABASE_URL_ANALYTICS` puis lance `node dist/jobs/run-job.js …`. Pour exécuter dbt dans le container :

  ```bash
  docker run --rm \
    --env-file analytics/.env \
    ghcr.io/<organisation>/analytics:latest \
    dbt run
  ```

- **Terraform** : dans `terraform/jobs-analytics.tf`, on déclare un `scaleway_job_definition` qui utilise l’image Docker, injecte les mêmes variables d’environnement et lance `node dist/jobs/run-job.js export-to-analytics-raw stat_event` (ou `dbt run …` selon le besoin). Les secrets sont fournis via `local.secrets` ou la gestion standard Scaleway.

## Tests & documentation

- Les sources sont décrites dans `models/raw.yml` (tests `not_null`, `unique`, etc.).
- Pour générer la documentation :

  ```bash
  analytics/scripts/dbt-env.sh docs generate
  analytics/scripts/dbt-env.sh docs serve
  ```

## Bonnes pratiques

- Toujours lancer `dbt ls` avant un `dbt run` pour vérifier que le profil est bien résolu.
- Les migrations (dbmate) doivent être exécutées avant `dbt run` pour s’assurer que les tables dans `analytics_raw` sont à jour.

## Lint SQL avec sqlfluff

Le projet utilise [sqlfluff](https://docs.sqlfluff.com/) pour garantir une mise en forme homogène des modèles dbt.

### Installation locale

1. Installe Python 3 et pip.
2. Ajoute les dépendances :
   ```bash
   pip install sqlfluff
   ```
3. Vérifie la version :
   ```bash
   sqlfluff version
   ```

### Lancer un lint

Depuis `analytics/dbt/analytics` :

```bash
sqlfluff lint models/staging/stat_event
```

ou pour un fichier précis :

```bash
sqlfluff lint models/staging/stat_event/stg_stat_event__click.sql
```

### Auto-format

Pour appliquer les corrections :

```bash
sqlfluff fix path/to/file.sql
```

Ajoute `--force` pour réécrire sans confirmation :

```bash
sqlfluff fix models/ --force
```

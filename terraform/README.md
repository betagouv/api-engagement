# Infrastructure Terraform pour API Engagement

Ce répertoire contient la configuration Terraform pour déployer l'application API Engagement sur Scaleway Serverless Containers.

## Architecture

L'infrastructure déploie les services suivants sur Scaleway :

- **API** : Backend API REST
- **Process** : Service de traitement asynchrone
- **App** : Frontend principal
- **Widget Bénévolat** : Widget pour les missions de bénévolat
- **Widget Volontariat** : Widget pour les missions de service civique

## Prérequis

1. Un compte Scaleway avec un projet créé
2. Les secrets nécessaires configurés dans GitHub
3. Un registre GitHub Container Registry configuré

## Configuration des secrets GitHub

Pour que le workflow fonctionne correctement, vous devez configurer les secrets suivants dans GitHub :

### Secrets pour Scaleway

- `SCALEWAY_ACCESS_KEY` : Clé d'accès Scaleway
- `SCALEWAY_SECRET_KEY` : Clé secrète Scaleway
- `SCALEWAY_PROJECT_ID` : ID du projet Scaleway

### Secrets pour Terraform

- `TERRAFORM_PG_CONN_STR` : Chaîne de connexion PostgreSQL pour le backend Terraform

### Secrets pour l'application

Créez un secret dans Scaleway nommé `production-secret` ou `staging-secret` (selon l'environnement) avec le contenu suivant encodé en base64 :

```json
{
  "DB_ENDPOINT": "mongodb://...",
  "ES_ENDPOINT": "https://...",
  "SENTRY_DSN": "https://...",
  "SENDINBLUE_APIKEY": "...",
  "SECRET": "...",
  "SCW_ACCESS_KEY": "...",
  "SCW_SECRET_KEY": "...",
  "GOOGLE_FOR_JOB_KEY": "..."
}
```

## Utilisation locale

Pour utiliser Terraform localement :

```bash
# Initialiser Terraform avec le backend PostgreSQL
export SCW_ACCESS_KEY="votre_access_key"
export SCW_SECRET_KEY="votre_secret_key"
export SCW_DEFAULT_PROJECT_ID="votre_project_id"

cd terraform

terraform init \
  -backend-config="conn_str=postgres://user:password@host:port/database" \
  -backend-config="schema=terraform_production" \
  -backend-config="workspace_name=default"

# Sélectionner l'environnement
terraform workspace select production  # ou staging

# Planifier les changements
terraform plan -var="image_tag=latest" -var="project_id=$SCW_DEFAULT_PROJECT_ID"

# Appliquer les changements
terraform apply -var="image_tag=latest" -var="project_id=$SCW_DEFAULT_PROJECT_ID"
```

## Workflow GitHub Actions

Le déploiement est automatisé via GitHub Actions :

1. Le workflow `docker-build-push.yml` construit et pousse les images Docker vers GitHub Container Registry
2. Le workflow `deploy-to-scaleway.yml` déploie ces images sur Scaleway Serverless Containers

Le déploiement est déclenché automatiquement après un push sur les branches `main` (production) ou `staging`, ou manuellement via l'interface GitHub Actions.

## Variables Terraform

- `image_tag` : Tag de l'image Docker à déployer
- `project_id` : ID du projet Scaleway
- `github_repository` : Nom du dépôt GitHub (format: org/repo)

## Outputs

Après le déploiement, Terraform affiche les URLs des différents services :

- `api_endpoint` : URL de l'API
- `app_endpoint` : URL de l'application frontend
- `process_endpoint` : URL du service de traitement
- `benevolat_endpoint` : URL du widget bénévolat
- `volontariat_endpoint` : URL du widget volontariat

# Infrastructure Terraform du projet security

Cette configuration est une racine Terraform autonome pour le projet Scaleway `security`, dans l'organisation existante. Elle utilise une clé API de cette organisation et cible le projet via `project_id`. L'organisation n'est pas recréée ni gérée ici.

La racine est séparée de `terraform/` : elle possède son propre état et son propre déploiement. Le projet `security` peut accueillir d'autres ressources de sécurité à l'avenir ; le bucket décrit ici est dédié aux sauvegardes RDB.

## Bucket de sauvegardes RDB

La configuration crée un bucket Object Storage versionné, avec Object Lock en mode `COMPLIANCE` et une rétention par défaut de 30 jours. Les objets protégés ne peuvent pas être supprimés ni remplacés avant l'échéance. La durée est ajustable via `immutable_retention_days`.

## Accès

Créer une clé API dédiée à Terraform et lui accorder les permissions requises dans le projet `security`. La clé utilisée par l'application doit rester distincte et limitée au dépôt des objets de sauvegarde. Le provider Scaleway lit `SCW_ACCESS_KEY`, `SCW_SECRET_KEY` et `SCW_DEFAULT_PROJECT_ID`. Comme dans le Terraform principal, `TF_VAR_project_id` fournit aussi l'ID aux ressources qui définissent explicitement leur `project_id`. Le provider utilise l'organisation par défaut des identifiants.

Le backend S3 réutilise la clé Scaleway du projet `security`, exportée aussi sous `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`, comme dans le workflow Terraform principal. Cette clé doit avoir accès au bucket d'état `security-terraform-state`.

## Déploiement CI en production

Le workflow `.github/workflows/main-pipeline.yml` appelle `.github/workflows/terraform-security-deploy.yml` comme déploiement indépendant, en parallèle de `.github/workflows/terraform-deploy.yml`, après le build. Il reprend le cycle `checkout`, `init`, `plan` et `apply`, avec son propre état et ses identifiants. Comme les autres workflows CI du dépôt, son job `changes` utilise `dorny/paths-filter` pour détecter les changements sous `terraform/security/`. Il ne s'exécute que lors d'un push sur `main` (production) et ne lance Terraform que si ce dossier a changé. Il ne peut pas être lancé manuellement, depuis `staging` ou pour `sandbox`.

Configurer ces secrets dans l'environnement GitHub `production` : `SECURITY_SCW_ACCESS_KEY`, `SECURITY_SCW_SECRET_KEY` et `SECURITY_SCW_PROJECT_ID`. La clé Scaleway doit être limitée au projet `security` et avoir accès au bucket d'état Terraform, distinct du bucket de sauvegardes.

## État Terraform

Le bucket `security-terraform-state` doit exister avant le premier `terraform init`. Le créer dans le projet `security`, activer son versioning et en limiter l'accès aux opérateurs Terraform. Il doit être distinct du bucket de sauvegardes RDB : l'état Terraform n'est pas une sauvegarde applicative et ne doit pas recevoir les objets RDB.

Initialiser avec les identifiants du backend :

```sh
export AWS_ACCESS_KEY_ID="<clé de stockage du projet security>"
export AWS_SECRET_ACCESS_KEY="<secret de stockage du projet security>"

terraform -chdir=terraform/security init
```

Les valeurs sensibles restent dans l'environnement et ne doivent pas être ajoutées aux fichiers `.tfvars` ni au dépôt.

## Variables et déploiement

Copier `terraform.tfvars.example` vers `terraform.tfvars`, puis remplacer les deux valeurs d'exemple par l'ID du projet et le nom globalement unique du bucket. Le fichier réel est ignoré par Git. Ensuite, lancer `terraform -chdir=terraform/security plan` et `apply` avec les identifiants destinés au projet `security`.

## Réplication depuis le projet applicatif

Le job `rdb-backup-replication` est défini dans la racine Terraform principale (`terraform/`) et tourne dans le projet applicatif par défaut. Il examine le backup le plus récent de la base RDB, attend qu'il soit au statut `ready`, demande son export à l'API RDB, puis transfère le flux vers `<nom-instance>/<date>/<backup-id>.dump` dans ce bucket. Le nom d'instance vient du backup retourné par l'API et est nettoyé pour former un préfixe S3 sûr. L'objet existant est détecté avant l'envoi, ce qui évite de réécrire une sauvegarde déjà verrouillée.

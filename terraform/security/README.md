# Infrastructure Terraform du projet security

Cette configuration est une racine Terraform autonome pour le projet Scaleway `security`, dans l'organisation existante. Elle utilise une clé API de cette organisation et cible le projet via `security_project_id`. L'organisation n'est pas recréée ni gérée ici.

La racine est séparée de `terraform/` : elle possède son propre état et son propre déploiement. Le projet `security` peut accueillir d'autres ressources de sécurité à l'avenir ; le bucket décrit ici est dédié aux sauvegardes RDB.

## Bucket de sauvegardes RDB

La configuration crée un bucket Object Storage versionné, avec Object Lock en mode `COMPLIANCE` et une rétention par défaut de 30 jours. Les objets protégés ne peuvent pas être supprimés ni remplacés avant l'échéance. La durée est ajustable via `immutable_retention_days`.

## Accès

Créer une clé API dédiée à Terraform et lui accorder les permissions requises dans le projet `security`. La clé utilisée par l'application doit rester distincte et limitée au dépôt des objets de sauvegarde. Le provider Scaleway lit `SCW_ACCESS_KEY` et `SCW_SECRET_KEY`; le projet est fourni via la variable Terraform `security_project_id`. Le provider utilise l'organisation par défaut de ces identifiants.

Le backend S3 utilise séparément `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`. Ils doivent correspondre à une clé de stockage ayant accès au bucket d'état dans le projet `security`.

## État Terraform

Le bucket d'état doit exister avant le premier `terraform init`. Le créer dans le projet `security`, activer son versioning et en limiter l'accès aux opérateurs Terraform. Il doit être distinct du bucket de sauvegardes RDB : l'état Terraform n'est pas une sauvegarde applicative et ne doit pas recevoir les objets RDB.

Initialiser avec les identifiants du backend et les paramètres du projet :

```sh
export AWS_ACCESS_KEY_ID="<clé de stockage du projet security>"
export AWS_SECRET_ACCESS_KEY="<secret de stockage du projet security>"

terraform -chdir=terraform/security init \
  -backend-config="bucket=<bucket-d-etat>" \
  -backend-config="key=api-engagement/security/terraform.tfstate" \
  -backend-config="region=fr-par" \
  -backend-config="endpoint=https://s3.fr-par.scw.cloud" \
  -backend-config="skip_credentials_validation=true" \
  -backend-config="skip_region_validation=true" \
  -backend-config="skip_requesting_account_id=true" \
  -backend-config="use_lockfile=true"
```

Les valeurs sensibles restent dans l'environnement et ne doivent pas être ajoutées aux fichiers `.tfvars` ni au dépôt.

## Variables et déploiement

Copier `terraform.tfvars.example` vers `terraform.tfvars`, puis remplacer les deux valeurs d'exemple par l'ID du projet et le nom globalement unique du bucket. Le fichier réel est ignoré par Git. Ensuite, lancer `terraform -chdir=terraform/security plan` et `apply` avec les identifiants destinés au projet `security`.

## Réplication depuis le projet applicatif

Le job `rdb-backup-replication` est défini dans la racine Terraform principale (`terraform/`) et tourne dans le projet applicatif par défaut. Il examine le backup le plus récent de la base RDB, attend qu'il soit au statut `ready`, demande son export à l'API RDB, puis transfère le flux vers `<nom-instance>/<date>/<backup-id>.dump` dans ce bucket. Le nom d'instance vient du backup retourné par l'API et est nettoyé pour former un préfixe S3 sûr. L'objet existant est détecté avant l'envoi, ce qui évite de réécrire une sauvegarde déjà verrouillée.

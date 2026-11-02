# CMS (Strapi) : landings et pages éditoriales de plateform (cf. cms/README.md).
# - Base PostgreSQL dédiée, créée hors Terraform comme la base core ; identifiants dans le secret `<workspace>-secret`.
# - Médias sur un bucket Object Storage (le disque d'un container serverless est éphémère).
# - Secrets Strapi et accès plateform → CMS dans le même secret (clés `CMS_*`, `PLATEFORM_CMS_API_TOKEN`).

locals {
  cms_media_bucket_name = "api-engagement-cms-media-${var.workspace}"
  cms_public_url        = var.cms_hostname != "" ? "https://${var.cms_hostname}" : ""
  # URL lue par plateform : domaine personnalisé, sinon domaine Scaleway du container.
  cms_url = local.cms_public_url != "" ? local.cms_public_url : var.enable_cms ? "https://${scaleway_container.cms[0].domain_name}" : ""

  # Clés du secret requises pour démarrer le CMS (vérifiées au plan quand enable_cms est actif).
  cms_required_secrets = [
    "CMS_APP_KEYS",
    "CMS_ADMIN_JWT_SECRET",
    "CMS_API_TOKEN_SALT",
    "CMS_TRANSFER_TOKEN_SALT",
    "CMS_ENCRYPTION_KEY",
    "CMS_JWT_SECRET",
    "CMS_DATABASE_HOST",
    "CMS_DATABASE_PORT",
    "CMS_DATABASE_NAME",
    "CMS_DATABASE_USERNAME",
    "CMS_DATABASE_PASSWORD",
  ]
}

# Médias publics en lecture : le CMS pose l'ACL `public-read` sur chaque objet envoyé.
resource "scaleway_object_bucket" "cms_media" {
  count      = var.enable_cms ? 1 : 0
  name       = local.cms_media_bucket_name
  project_id = var.project_id
  tags = {
    workspace = var.workspace
  }
}

resource "scaleway_container" "cms" {
  count              = var.enable_cms ? 1 : 0
  name               = "${var.workspace}-cms"
  description        = "CMS ${var.workspace} container"
  namespace_id       = scaleway_container_namespace.main.id
  registry_image     = "ghcr.io/${var.github_repository}/cms:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port               = 8080
  cpu_limit          = var.cms_cpu_limit
  memory_limit       = var.cms_memory_limit
  min_scale          = var.cms_min_scale
  max_scale          = var.cms_max_scale
  timeout            = 60
  privacy            = "public" # l'accès à l'admin et à l'API est protégé par l'authentification Strapi
  protocol           = "http1"
  http_option        = "redirected" # https only
  deploy             = true
  private_network_id = scaleway_vpc_private_network.main.id

  health_check {
    http {
      path = "/_health"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  environment_variables = {
    "ENV"           = var.env
    "IMAGE_VERSION" = var.image_tag

    # Derrière le proxy TLS de Scaleway : URL publique et confiance dans X-Forwarded-* (cookies `secure` de l'admin).
    "PUBLIC_URL" = local.cms_public_url
    "IS_PROXIED" = "true"

    # TLS sans vérification de l'autorité (équivalent de `sslmode=require`) : base atteinte via le Private Network.
    "DATABASE_SSL"                     = "true"
    "DATABASE_SSL_REJECT_UNAUTHORIZED" = "false"

    "CMS_MEDIA_BUCKET" = local.cms_media_bucket_name
    "CMS_MEDIA_REGION" = "fr-par"
  }

  secret_environment_variables = {
    "APP_KEYS"            = lookup(local.secrets, "CMS_APP_KEYS", "")
    "ADMIN_JWT_SECRET"    = lookup(local.secrets, "CMS_ADMIN_JWT_SECRET", "")
    "API_TOKEN_SALT"      = lookup(local.secrets, "CMS_API_TOKEN_SALT", "")
    "TRANSFER_TOKEN_SALT" = lookup(local.secrets, "CMS_TRANSFER_TOKEN_SALT", "")
    "ENCRYPTION_KEY"      = lookup(local.secrets, "CMS_ENCRYPTION_KEY", "")
    "JWT_SECRET"          = lookup(local.secrets, "CMS_JWT_SECRET", "")
    "DATABASE_HOST"       = lookup(local.secrets, "CMS_DATABASE_HOST", "")
    "DATABASE_PORT"       = lookup(local.secrets, "CMS_DATABASE_PORT", "")
    "DATABASE_NAME"       = lookup(local.secrets, "CMS_DATABASE_NAME", "")
    "DATABASE_USERNAME"   = lookup(local.secrets, "CMS_DATABASE_USERNAME", "")
    "DATABASE_PASSWORD"   = lookup(local.secrets, "CMS_DATABASE_PASSWORD", "")
    # Clés Object Storage déjà utilisées par l'API pour son bucket.
    "SCW_ACCESS_KEY" = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY" = local.secrets.SCW_SECRET_KEY
  }

  lifecycle {
    precondition {
      condition     = alltrue([for key in local.cms_required_secrets : lookup(local.secrets, key, "") != ""])
      error_message = "enable_cms est actif mais le secret ${var.workspace}-secret ne contient pas toutes les clés requises : ${join(", ", local.cms_required_secrets)}."
    }
  }
}

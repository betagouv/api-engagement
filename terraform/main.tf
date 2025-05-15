# https://registry.terraform.io/providers/scaleway/scaleway/latest/docs

terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.31.0"
    }
  }

  backend "s3" {
    region                      = "fr-par"
    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
  }

  required_version = ">= 1.0.0"
}

provider "scaleway" {
  zone   = "fr-par-1"
  region = "fr-par"
}

variable "image_tag" {
  type     = string
  default  = "latest"
  description = "Tag of the Docker image to deploy. Use 'latest' for the default environment tag, or a specific value like 'sha' for a specific commit."
}

variable "project_id" {
  type        = string
  description = "Scaleway Project ID"
}

variable "github_repository" {
  type     = string
  default  = "betagouv/api-engagement"
  description = "GitHub repository name in format org/repo"
}

# Secrets
data "scaleway_secret" "main" {
  name       = "${terraform.workspace}-secret"
  project_id = var.project_id
}

data "scaleway_secret_version" "main" {
  secret_id = data.scaleway_secret.main.id
  revision  = "latest_enabled"
}

locals {
  api_hostname         = terraform.workspace == "production" ? "api.api-engagement.beta.gouv.fr" : "api.api-engagement-dev.fr"
  app_hostname         = terraform.workspace == "production" ? "app.api-engagement.beta.gouv.fr" : "app.api-engagement-dev.fr"
  benevolat_hostname   = terraform.workspace == "production" ? "mission.api-engagement.beta.gouv.fr" : "mission.api-engagement-dev.fr"
  volontariat_hostname = terraform.workspace == "production" ? "sc.api-engagement.beta.gouv.fr" : "sc.api-engagement-dev.fr"
  process_hostname     = terraform.workspace == "production" ? "process.api-engagement.beta.gouv.fr" : "process.api-engagement-dev.fr"
  bucket_name          = terraform.workspace == "production" ? "api-engagement-bucket" : "api-engagement-bucket-staging"
  secrets              = jsondecode(base64decode(data.scaleway_secret_version.main.data))
}

# Containers namespace
resource "scaleway_container_namespace" "main" {
  name        = terraform.workspace
  description = "${terraform.workspace} namespace"
  project_id  = var.project_id
}

# API Container
resource "scaleway_container" "api" {
  name            = "${terraform.workspace}-api"
  description     = "API ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/api:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  # Update in function of terraform.workspace
  cpu_limit       = terraform.workspace == "production" ? 1680 : 560
  memory_limit    = terraform.workspace == "production" ? 2048 : 560
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 5 : 1
  timeout         = 60
  max_concurrency = 50
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  environment_variables = {
    "ENV"           = terraform.workspace
    "API_URL"       = "https://${local.api_hostname}"
    "APP_URL"       = "https://${local.app_hostname}"
    "BENEVOLAT_URL" = "https://${local.benevolat_hostname}"
    "VOLONTARIAT_URL" = "https://${local.volontariat_hostname}"
    "BUCKET_NAME"   = local.bucket_name
  }

  secret_environment_variables = {
    "DB_ENDPOINT"       = local.secrets.DB_ENDPOINT
    "ES_ENDPOINT"       = local.secrets.ES_ENDPOINT
    "SENTRY_DSN"        = local.secrets.SENTRY_DSN
    "SENDINBLUE_APIKEY" = local.secrets.SENDINBLUE_APIKEY
    "SECRET"            = local.secrets.SECRET
    "SCW_ACCESS_KEY"    = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY"    = local.secrets.SCW_SECRET_KEY
  }
}

resource "scaleway_container_domain" "api" {
  container_id = scaleway_container.api.id
  hostname     = local.api_hostname
}

# Process Container
resource "scaleway_container" "process" {
  name            = "${terraform.workspace}-process"
  description     = "Process ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/process:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 1680 : 560
  memory_limit    = terraform.workspace == "production" ? 2048 : 560
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 3 : 1
  timeout         = 300  # Longer timeout for process jobs
  max_concurrency = 20
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  environment_variables = {
    "ENV"           = terraform.workspace
    "API_URL"       = "https://${local.api_hostname}"
    "APP_URL"       = "https://${local.app_hostname}"
    "BENEVOLAT_URL" = "https://${local.benevolat_hostname}"
    "VOLONTARIAT_URL" = "https://${local.volontariat_hostname}"
    "BUCKET_NAME"   = local.bucket_name
  }

  secret_environment_variables = {
    "DB_ENDPOINT"       = local.secrets.DB_ENDPOINT
    "ES_ENDPOINT"       = local.secrets.ES_ENDPOINT
    "SENTRY_DSN"        = local.secrets.SENTRY_DSN
    "SENDINBLUE_APIKEY" = local.secrets.SENDINBLUE_APIKEY
    "SECRET"            = local.secrets.SECRET
    "SCW_ACCESS_KEY"    = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY"    = local.secrets.SCW_SECRET_KEY
  }
}

resource "scaleway_container_domain" "process" {
  container_id = scaleway_container.process.id
  hostname     = local.process_hostname
}

# App Container
resource "scaleway_container" "app" {
  name            = "${terraform.workspace}-app"
  description     = "App ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/app:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 560 : 560
  memory_limit    = terraform.workspace == "production" ? 1024 : 560
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 1 : 1
  timeout         = 60
  max_concurrency = 50
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  environment_variables = {
    "ENV"            = terraform.workspace
    "API_URL"        = "https://${local.api_hostname}"
    "BENEVOLAT_URL"  = "https://${local.benevolat_hostname}"
    "VOLONTARIAT_URL" = "https://${local.volontariat_hostname}"
  }
  
  secret_environment_variables = {
    "SENTRY_DSN" = local.secrets.SENTRY_DSN
  }
}

resource "scaleway_container_domain" "app" {
  container_id = scaleway_container.app.id
  hostname     = local.app_hostname
}

# Widget Volontariat Container
resource "scaleway_container" "volontariat" {
  name            = "${terraform.workspace}-volontariat"
  description     = "Widget volontariat ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/widget-volontariat:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 1120 : 560
  memory_limit    = terraform.workspace == "production" ? 1120 : 560
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 4 : 1
  timeout         = 60
  max_concurrency = 50
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  environment_variables = {
    "ENV"     = terraform.workspace
    "API_URL" = "https://${local.api_hostname}"
  }
  
  secret_environment_variables = {
    "SENTRY_DSN" = local.secrets.SENTRY_DSN
  }
}

resource "scaleway_container_domain" "volontariat" {
  container_id = scaleway_container.volontariat.id
  hostname     = local.volontariat_hostname
}

# Widget Benevolat Container
resource "scaleway_container" "benevolat" {
  name            = "${terraform.workspace}-benevolat"
  description     = "Widget benevolat ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/widget-benevolat:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 1120 : 560
  memory_limit    = terraform.workspace == "production" ? 1120 : 560
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 4 : 1
  timeout         = 60
  max_concurrency = 50
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  environment_variables = {
    "ENV"     = terraform.workspace
    "API_URL" = "https://${local.api_hostname}"
  }
  
  secret_environment_variables = {
    "SENTRY_DSN"         = local.secrets.SENTRY_DSN
    "GOOGLE_FOR_JOB_KEY" = local.secrets.GOOGLE_FOR_JOB_KEY
  }
}

resource "scaleway_container_domain" "benevolat" {
  container_id = scaleway_container.benevolat.id
  hostname     = local.benevolat_hostname
}

# Outputs
output "api_endpoint" {
  value = "https://${local.api_hostname}"
}

output "app_endpoint" {
  value = "https://${local.app_hostname}"
}

output "process_endpoint" {
  value = "https://${local.process_hostname}"
}

output "benevolat_endpoint" {
  value = "https://${local.benevolat_hostname}"
}

output "volontariat_endpoint" {
  value = "https://${local.volontariat_hostname}"
}

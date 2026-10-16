# POC Keep (alerting) : voir tools/keep/README.md.
# Une seule instance pour tous les environnements (Metabase est unique), déployée par le workspace
# qui active `enable_keep`. Désactivé par défaut.
#
# Choix structurants :
# - le backend Keep porte le scheduler des workflows : min_scale = max_scale = 1 (pas de scale-to-zero,
#   pas de réplicas, sinon les workflows seraient exécutés plusieurs fois) ;
# - un conteneur Scaleway n'a pas de disque persistant : secrets en base (SECRET_MANAGER_TYPE=DB) ;
# - websocket Soketi non déployé (PUSHER_DISABLED) : l'UI ne se rafraîchit pas en temps réel ;
# - providers et workflows provisionnés au démarrage (KEEP_PROVIDERS, KEEP_WORKFLOWS_DIRECTORY).

locals {
  # Hostnames obligatoires (sinon cycle : l'URL par défaut dépend du conteneur lui-même).
  keep_api_url = var.enable_keep ? "https://${var.keep_api_hostname}" : ""
  keep_ui_url  = var.enable_keep ? "https://${var.keep_hostname}" : ""

  # Providers webhook vers l'API (notification du chargé de déploiement, write-back du statut).
  keep_providers = var.enable_keep ? jsonencode({
    for name, path in { "api-notify" = "notify", "api-status" = "status" } : name => {
      type                           = "webhook"
      authentication = {
        url     = "https://${var.api_hostname}/alerts-poc/${path}"
        method  = "POST"
        headers = [{ key = "Authorization", value = "Bearer ${local.secrets.ALERTS_WEBHOOK_TOKEN}" }]
        verify  = true
      }
    }
  }) : ""
}

resource "scaleway_rdb_instance" "keep" {
  count = var.enable_keep ? 1 : 0

  name           = "${var.workspace}-keep"
  project_id     = var.project_id
  node_type      = var.keep_db_node_type
  engine         = "PostgreSQL-16"
  is_ha_cluster  = false
  disable_backup = false
  user_name      = "keep"
  password       = local.secrets.KEEP_DB_PASSWORD
  tags           = ["${var.workspace}", "keep"]

  private_network {
    pn_id       = scaleway_vpc_private_network.main.id
    enable_ipam = true
  }
}

resource "scaleway_rdb_database" "keep" {
  count = var.enable_keep ? 1 : 0

  instance_id = scaleway_rdb_instance.keep[0].id
  name        = "keep"
}

resource "scaleway_container" "keep_backend" {
  count = var.enable_keep ? 1 : 0

  name               = "${var.workspace}-keep-api"
  description        = "Keep API ${var.workspace} container"
  namespace_id       = scaleway_container_namespace.main.id
  registry_image     = var.keep_backend_image != "" ? var.keep_backend_image : "us-central1-docker.pkg.dev/keephq/keep/keep-api:${var.keep_version}"
  port               = 8080
  cpu_limit          = var.keep_backend_cpu_limit
  memory_limit       = var.keep_backend_memory_limit
  min_scale          = 1
  max_scale          = 1
  timeout            = 60
  privacy            = "public" # appelé par Metabase et sentry-webhook, protégé par l'API key Keep
  protocol           = "http1"
  http_option        = "redirected"
  deploy             = true
  private_network_id = scaleway_vpc_private_network.main.id

  health_check {
    http {
      path = "/healthcheck"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  environment_variables = {
    "PORT"                     = "8080"
    "AUTH_TYPE"                = "DB"
    "KEEP_DEFAULT_USERNAME"    = "keep"
    "KEEP_API_URL"             = local.keep_api_url
    "SECRET_MANAGER_TYPE"      = "DB"
    "PUSHER_DISABLED"          = "true"
    "POSTHOG_DISABLED"         = "true"
    "SENTRY_DISABLED"          = "true"
    "KEEP_WORKFLOWS_DIRECTORY" = var.keep_backend_image != "" ? "/workflows" : ""
  }

  secret_environment_variables = {
    "DATABASE_CONNECTION_STRING" = "postgresql+psycopg2://keep:${local.secrets.KEEP_DB_PASSWORD}@${scaleway_rdb_instance.keep[0].private_network[0].ip}:${scaleway_rdb_instance.keep[0].private_network[0].port}/keep"
    "KEEP_JWT_SECRET"            = local.secrets.KEEP_JWT_SECRET
    "KEEP_DEFAULT_PASSWORD"      = local.secrets.KEEP_DEFAULT_PASSWORD
    "KEEP_PROVIDERS"             = local.keep_providers
  }

  depends_on = [scaleway_rdb_database.keep]

  lifecycle {
    precondition {
      condition     = var.keep_api_hostname != "" && var.keep_hostname != ""
      error_message = "keep_hostname and keep_api_hostname must be set when enable_keep is true."
    }
  }
}

resource "scaleway_container" "keep_frontend" {
  count = var.enable_keep ? 1 : 0

  name           = "${var.workspace}-keep-ui"
  description    = "Keep UI ${var.workspace} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "us-central1-docker.pkg.dev/keephq/keep/keep-ui:${var.keep_version}"
  port           = 3000
  cpu_limit      = 500
  memory_limit   = 1024
  min_scale      = 0
  max_scale      = 1
  timeout        = 60
  privacy        = "public"
  protocol       = "http1"
  http_option    = "redirected"
  deploy         = true

  environment_variables = {
    "AUTH_TYPE"                    = "DB"
    "API_URL"                      = local.keep_api_url
    "NEXT_PUBLIC_API_URL"          = local.keep_api_url
    "NEXTAUTH_URL"                 = local.keep_ui_url
    "PUSHER_DISABLED"              = "true"
    "POSTHOG_DISABLED"             = "true"
    "NEXT_PUBLIC_POSTHOG_DISABLED" = "true"
    "SENTRY_DISABLED"              = "true"
  }

  secret_environment_variables = {
    "NEXTAUTH_SECRET" = local.secrets.KEEP_NEXTAUTH_SECRET
  }
}

resource "scaleway_container_domain" "keep_ui" {
  count = var.enable_keep ? 1 : 0

  container_id = scaleway_container.keep_frontend[0].id
  hostname     = var.keep_hostname
}

resource "scaleway_container_domain" "keep_api" {
  count = var.enable_keep ? 1 : 0

  container_id = scaleway_container.keep_backend[0].id
  hostname     = var.keep_api_hostname
}

output "keep_ui_url" {
  value = local.keep_ui_url
}

output "keep_api_url" {
  value = local.keep_api_url
}

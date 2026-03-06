resource "scaleway_container" "api" {
  name            = "${var.env}-api"
  description     = "API ${var.env} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/api:${var.image_env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = var.api_cpu_limit
  memory_limit    = var.api_memory_limit
  min_scale       = var.api_min_scale
  max_scale       = var.api_max_scale
  timeout         = 60
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  health_check {
    http {
      path = "/"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  scaling_option {
    cpu_usage_threshold = 80
  }

  environment_variables = {
    "ENV"                        = var.app_env
    "API_URL"                    = "https://${var.api_hostname}"
    "APP_URL"                    = "https://${var.app_hostname}"
    "BENEVOLAT_URL"              = var.benevolat_hostname != "" ? "https://${var.benevolat_hostname}" : ""
    "VOLONTARIAT_URL"            = var.volontariat_hostname != "" ? "https://${var.volontariat_hostname}" : ""
    "PILOTY_BASE_URL"            = var.piloty_hostname
    "BUCKET_NAME"                = var.bucket_name
    "SLACK_JOBTEASER_CHANNEL_ID" = var.slack_jobteaser_channel_id

    # Feature flags ES migration
    "WRITE_STATS_DUAL" = "true"
    "READ_STATS_FROM"  = "pg"
  }

  secret_environment_variables = {
    "SECRET"                 = local.secrets.SECRET
    "DATABASE_URL_CORE"      = local.secrets.DATABASE_URL_CORE
    "DATABASE_URL_ANALYTICS" = lookup(local.secrets, "DATABASE_URL_ANALYTICS", "")
    "SENTRY_DSN_API"         = local.secrets.SENTRY_DSN_API
    "SENDINBLUE_APIKEY"      = local.secrets.SENDINBLUE_APIKEY
    "SLACK_TOKEN"            = local.secrets.SLACK_TOKEN
    "SCW_ACCESS_KEY"         = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY"         = local.secrets.SCW_SECRET_KEY
    "LETUDIANT_PILOTY_TOKEN" = lookup(local.secrets, "LETUDIANT_PILOTY_TOKEN", "")
    "METABASE_API_KEY"       = lookup(local.secrets, "METABASE_API_KEY", "")
    "METABASE_URL"           = lookup(local.secrets, "METABASE_URL", "")
  }
}

# App Container
resource "scaleway_container" "app" {
  name           = "${var.env}-app"
  description    = "App ${var.env} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/app:${var.image_env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port           = 8080
  cpu_limit      = var.app_cpu_limit
  memory_limit   = var.app_memory_limit
  min_scale      = var.app_min_scale
  max_scale      = var.app_max_scale
  timeout        = 60
  privacy        = "public"
  protocol       = "http1"
  http_option    = "redirected" # https only
  deploy         = true
}

# Widget Container
resource "scaleway_container" "widget" {
  count          = var.enable_widget ? 1 : 0
  name           = "${var.env}-widget"
  description    = "Widget ${var.env} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/widget:${var.image_env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port           = 8080
  cpu_limit      = var.widget_cpu_limit
  memory_limit   = var.widget_memory_limit
  min_scale      = var.widget_min_scale
  max_scale      = var.widget_max_scale
  timeout        = 60
  privacy        = "public"
  protocol       = "http1"
  http_option    = "redirected" # https only
  deploy         = true

  health_check {
    http {
      path = "/api/healthz"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  environment_variables = {
    "ENV"     = var.app_env
    "API_URL" = "https://${var.api_hostname}"
  }

  secret_environment_variables = {
    "SENTRY_DSN" = local.secrets.SENTRY_DSN_WIDGET
  }
}

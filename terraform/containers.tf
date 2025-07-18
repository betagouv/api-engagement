resource "scaleway_container" "api" {
  name            = "${terraform.workspace}-api"
  description     = "API ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/api-api:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 1500 : 250
  memory_limit    = terraform.workspace == "production" ? 2048 : 512
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 5 : 1
  timeout         = 60
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  health_check {
    http {
      path = "/"
    }
    interval = "30s"
    failure_threshold = 3
  }

  scaling_option {
    cpu_usage_threshold = 80
  }

  environment_variables = {
    "ENV"           = terraform.workspace
    "API_URL"       = "https://${local.api_hostname}"
    "APP_URL"       = "https://${local.app_hostname}"
    "BENEVOLAT_URL" = "https://${local.benevolat_hostname}"
    "VOLONTARIAT_URL" = "https://${local.volontariat_hostname}"
    "BUCKET_NAME"   = local.bucket_name
    "SLACK_JOBTEASER_CHANNEL_ID" = terraform.workspace == "production" ? "C080H9MH56W" : ""
  }

  secret_environment_variables = {
    "SECRET"            = local.secrets.SECRET
    "DB_ENDPOINT"       = local.secrets.DB_ENDPOINT
    "ES_ENDPOINT"       = local.secrets.ES_ENDPOINT
    "SENTRY_DSN"        = local.secrets.SENTRY_DSN
    "SENDINBLUE_APIKEY" = local.secrets.SENDINBLUE_APIKEY
    "SLACK_TOKEN"       = local.secrets.SLACK_TOKEN
    "SCW_ACCESS_KEY"    = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY"    = local.secrets.SCW_SECRET_KEY
    "PILOTY_BASE_URL"   = local.secrets.PILOTY_BASE_URL
    "LETUDIANT_PILOTY_TOKEN" = local.secrets.LETUDIANT_PILOTY_TOKEN
  }
}

# App Container
resource "scaleway_container" "app" {
  name            = "${terraform.workspace}-app"
  description     = "App ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/app:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 500 : 250
  memory_limit    = terraform.workspace == "production" ? 1024 : 512
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 1 : 1
  timeout         = 60
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true
}

# Widget Container
resource "scaleway_container" "widget" {
  name            = "${terraform.workspace}-widget"
  description     = "Widget ${terraform.workspace} container"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "ghcr.io/${var.github_repository}/widget:${terraform.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port            = 8080
  cpu_limit       = terraform.workspace == "production" ? 500 : 250
  memory_limit    = terraform.workspace == "production" ? 1024 : 512
  min_scale       = terraform.workspace == "production" ? 1 : 1
  max_scale       = terraform.workspace == "production" ? 4 : 1
  timeout         = 60
  privacy         = "public"
  protocol        = "http1"
  http_option     = "redirected" # https only
  deploy          = true

  scaling_option {
    concurrent_requests_threshold = 15
  }

  environment_variables = {
    "ENV"     = terraform.workspace
    "API_URL" = "https://${local.api_hostname}"
  }
  
  secret_environment_variables = {
    "SENTRY_DSN" = local.secrets.SENTRY_DSN
  }
}


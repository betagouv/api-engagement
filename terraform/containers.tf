resource "scaleway_container" "api" {
  name                = "${var.workspace}-api"
  description         = "API ${var.workspace} container"
  namespace_id        = scaleway_container_namespace.main.id
  registry_image      = "ghcr.io/${var.github_repository}/api:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port                = 8080
  cpu_limit           = var.api_cpu_limit
  memory_limit        = var.api_memory_limit
  min_scale           = var.api_min_scale
  max_scale           = var.api_max_scale
  timeout             = 60
  privacy             = "public"
  protocol            = "http1"
  http_option         = "redirected" # https only
  deploy              = true
  private_network_id  = scaleway_vpc_private_network.main.id

  health_check {
    http {
      path = "/"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  scaling_option {
    cpu_usage_threshold = 70
  }

  environment_variables = {
    "ENV"                        = var.env
    "IMAGE_VERSION"              = var.image_tag
    "API_URL"                    = var.api_hostname != "" ? "https://${var.api_hostname}" : ""
    "APP_URL"                    = var.app_hostname != "" ? "https://${var.app_hostname}" : ""
    "BENEVOLAT_URL"              = var.benevolat_hostname != "" ? "https://${var.benevolat_hostname}" : ""
    "VOLONTARIAT_URL"            = var.volontariat_hostname != "" ? "https://${var.volontariat_hostname}" : ""
    "PILOTY_BASE_URL"            = var.piloty_hostname
    "BUCKET_NAME"                = var.bucket_name
    "SLACK_JOBTEASER_CHANNEL_ID" = var.slack_jobteaser_channel_id
    "PRISMA_POOL_SIZE_CORE"      = "20"
    "PRISMA_POOL_TIMEOUT"        = "20"
    "PRISMA_CONNECT_TIMEOUT"     = "10"
    "COCKPIT_METRICS_OTLP_URL"   = var.cockpit_metrics_otlp_url
    "TYPESENSE_HOST"             = var.typesense_load_balancer_private_ip
    "TYPESENSE_PORT"             = "8108"

    # Feature flags ES migration
    "WRITE_STATS_DUAL" = "true"
    "READ_STATS_FROM"  = "pg"

    "SCW_QUEUE_ENDPOINT"               = var.enable_async_tasks ? "https://sqs.mnq.fr-par.scaleway.com" : ""
    "SCW_QUEUE_URL_MISSION_ENRICHMENT" = var.enable_async_tasks ? module.async_task_queues["mission_enrichment"].url : ""
    "SCW_QUEUE_URL_MISSION_SCORING"    = var.enable_async_tasks ? module.async_task_queues["mission_scoring"].url : ""
    "SCW_QUEUE_URL_MISSION_INDEX"      = var.enable_async_tasks ? module.async_task_queues["mission_index"].url : ""
  }

  secret_environment_variables = {
    "SECRET"                 = local.secrets.SECRET
    "DATABASE_URL_CORE"      = local.secrets.DATABASE_URL_CORE
    "SENTRY_DSN_API"         = local.secrets.SENTRY_DSN_API
    "SENDINBLUE_APIKEY"      = local.secrets.SENDINBLUE_APIKEY
    "SLACK_TOKEN"            = local.secrets.SLACK_TOKEN
    "SCW_ACCESS_KEY"         = local.secrets.SCW_ACCESS_KEY
    "SCW_SECRET_KEY"         = local.secrets.SCW_SECRET_KEY
    "SCW_QUEUE_ACCESS_KEY"   = var.enable_async_tasks ? scaleway_mnq_sqs_credentials.async_task_publisher[0].access_key : ""
    "SCW_QUEUE_SECRET_KEY"   = var.enable_async_tasks ? scaleway_mnq_sqs_credentials.async_task_publisher[0].secret_key : ""
    "LETUDIANT_PILOTY_TOKEN" = lookup(local.secrets, "LETUDIANT_PILOTY_TOKEN", "")
    "METABASE_API_KEY"       = lookup(local.secrets, "METABASE_API_KEY", "")
    "METABASE_URL"           = lookup(local.secrets, "METABASE_URL", "")
    "COCKPIT_METRICS_TOKEN"  = lookup(local.secrets, "COCKPIT_METRICS_TOKEN", "")
    "TYPESENSE_API_KEY"      = lookup(local.secrets, "TYPESENSE_API_KEY", "")
  }
}

resource "scaleway_container" "api_worker" {
  count          = var.enable_async_tasks ? 1 : 0
  name           = "${var.workspace}-api-worker"
  description    = "API worker ${var.workspace} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/api-worker:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port           = 8080
  cpu_limit      = var.worker_cpu_limit
  memory_limit   = var.worker_memory_limit
  min_scale      = var.worker_min_scale
  max_scale      = var.worker_max_scale
  timeout        = 300
  privacy            = "private"
  protocol           = "http1"
  deploy             = true
  private_network_id = scaleway_vpc_private_network.main.id

  health_check {
    http {
      path = "/"
    }
    interval          = "30s"
    failure_threshold = 3
  }

  environment_variables = {
    "ENV"                               = var.env
    "IMAGE_VERSION"                     = var.image_tag
    "PORT_WORKER"                       = "8080"
    "PRISMA_POOL_SIZE_CORE"             = "20"
    "PRISMA_POOL_TIMEOUT"               = "20"
    "PRISMA_CONNECT_TIMEOUT"            = "10"
    "SCW_QUEUE_ENDPOINT"                = "https://sqs.mnq.fr-par.scaleway.com"
    "SCW_QUEUE_URL_MISSION_ENRICHMENT"  = module.async_task_queues["mission_enrichment"].url
    "SCW_QUEUE_URL_MISSION_SCORING"     = module.async_task_queues["mission_scoring"].url
    "SCW_QUEUE_URL_MISSION_INDEX"       = module.async_task_queues["mission_index"].url
    "ALBERT_BASE_URL"                   = lookup(local.secrets, "ALBERT_BASE_URL", "https://albert.api.etalab.gouv.fr")
    "TYPESENSE_HOST"                    = var.typesense_load_balancer_private_ip
    "TYPESENSE_PORT"                    = "8108"
  }

  secret_environment_variables = {
    "DATABASE_URL_CORE"    = local.secrets.DATABASE_URL_CORE
    "SCW_QUEUE_ACCESS_KEY" = scaleway_mnq_sqs_credentials.async_task_publisher[0].access_key
    "SCW_QUEUE_SECRET_KEY" = scaleway_mnq_sqs_credentials.async_task_publisher[0].secret_key
    "MISTRAL_API_KEY"      = lookup(local.secrets, "MISTRAL_API_KEY", "")
    "ALBERT_API_KEY"       = lookup(local.secrets, "ALBERT_API_KEY", "")
    "TYPESENSE_API_KEY"    = lookup(local.secrets, "TYPESENSE_API_KEY", "")
  }
}

# App Container
resource "scaleway_container" "app" {
  count        = var.enable_app ? 1 : 0
  name         = "${var.workspace}-app"
  description  = "App ${var.workspace} container"
  namespace_id = scaleway_container_namespace.main.id
  # App is always built for the workspace
  registry_image = "ghcr.io/${var.github_repository}/app:${var.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
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

# POC Quiz Container
resource "scaleway_container" "poc_quiz" {
  count          = var.enable_poc_quiz ? 1 : 0
  name           = "${var.workspace}-poc-quiz"
  description    = "POC Quiz ${var.workspace} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/poc-quiz:${var.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port           = 8080
  cpu_limit      = 250
  memory_limit   = 512
  min_scale      = 0
  max_scale      = 1
  timeout        = 60
  privacy        = "public"
  protocol       = "http1"
  http_option    = "redirected"
  deploy         = true

  environment_variables = {
    "API_URL" = "https://${scaleway_container.api.domain_name}"
  }
}

# Plateform Container
resource "scaleway_container" "plateform" {
  count          = var.enable_plateform ? 1 : 0
  name           = "${var.workspace}-plateform"
  description    = "Plateform ${var.workspace} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/plateform:${var.workspace}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  port           = 8080
  cpu_limit      = var.plateform_cpu_limit
  memory_limit   = var.plateform_memory_limit
  min_scale      = var.plateform_min_scale
  max_scale      = var.plateform_max_scale
  timeout        = 60
  privacy        = "public"
  protocol       = "http1"
  http_option    = "redirected"
  deploy         = true

  environment_variables = {
    "VITE_API_URL" = var.api_hostname != "" ? "https://${var.api_hostname}" : "https://${scaleway_container.api.domain_name}"
  }

  secret_environment_variables = {
    "VITE_MAPTILER_API_KEY" = lookup(local.secrets, "VITE_MAPTILER_API_KEY", "")
  }
}

# Widget Container
resource "scaleway_container" "widget" {
  count          = var.enable_widget ? 1 : 0
  name           = "${var.workspace}-widget"
  description    = "Widget ${var.workspace} container"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "ghcr.io/${var.github_repository}/widget:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
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
    "ENV"     = var.env
    "API_URL" = "https://${var.api_hostname}"
  }

  secret_environment_variables = {
    "SENTRY_DSN" = local.secrets.SENTRY_DSN_WIDGET
  }
}

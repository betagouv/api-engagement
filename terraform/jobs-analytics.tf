locals {
  common_analytics_env_vars = {
    "ENV"                    = var.env
    "DATABASE_URL_CORE"      = local.secrets.DATABASE_URL_CORE
    "DATABASE_URL_ANALYTICS" = lookup(local.secrets, "DATABASE_URL_ANALYTICS", "")
    "METABASE_DATABASE_NAME" = lookup(local.secrets, "METABASE_DATABASE_NAME", "")
    "METABASE_URL"           = lookup(local.secrets, "METABASE_URL", "")
    "METABASE_API_KEY"       = lookup(local.secrets, "METABASE_API_KEY", "")
    "SENTRY_DSN_JOBS"        = lookup(local.secrets, "SENTRY_DSN_JOBS", "")
    "SLACK_TOKEN"            = local.secrets.SLACK_TOKEN
    "SLACK_CRON_CHANNEL_ID"  = lookup(local.secrets, "SLACK_CRON_CHANNEL_ID", "")
    "POSTHOG_HOST"           = lookup(local.secrets, "POSTHOG_HOST", "")
    "POSTHOG_PROJECT_ID"     = lookup(local.secrets, "POSTHOG_PROJECT_ID", "")
    "POSTHOG_API_KEY"        = lookup(local.secrets, "POSTHOG_API_KEY", "")
  }

  image_analytics_uri = "ghcr.io/${var.github_repository}/analytics:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
}

resource "scaleway_job_definition" "analytics-table-raw" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-table-raw"
  project_id             = var.project_id
  cpu_limit              = 1000
  memory_limit           = 2048
  local_storage_capacity = 1024
  image_uri              = local.image_analytics_uri
  timeout                = "120m"

  cron {
    schedule = "0 3 * * *" # Every day at 3:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw"
  })
}

resource "scaleway_job_definition" "analytics-tracking-raw" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-tracking-raw"
  project_id             = var.project_id
  cpu_limit              = 1000
  memory_limit           = 2048
  local_storage_capacity = 1024
  image_uri              = local.image_analytics_uri
  timeout                = "120m"

  cron {
    schedule = "0 * * * *" # Every hour
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "node dist/jobs/run-job.js export-tracking-raw tracking_event"
  })
}

resource "scaleway_job_definition" "analytics-dbt-run" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-dbt-run"
  project_id             = var.project_id
  cpu_limit              = 1000
  memory_limit           = 2048
  local_storage_capacity = 1024
  image_uri              = local.image_analytics_uri
  timeout                = "120m"

  cron {
    schedule = "0 5 * * *" # Every day at 5:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "sh scripts/dbt-env.sh run"
  })
}

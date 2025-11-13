locals {
  common_analytics_env_vars = {
    "ENV"                     = terraform.workspace
    "DATABASE_URL_CORE"       = local.secrets.DATABASE_URL_CORE
    "DATABASE_URL_ANALYTICS"  = local.secrets.DATABASE_URL_ANALYTICS
    "SENTRY_DSN_JOBS"         = local.secrets.SENTRY_DSN_JOBS
    "SLACK_TOKEN"             = local.secrets.SLACK_TOKEN
  }

  image_analytics_uri = "ghcr.io/${var.github_repository}/analytics:${terraform.workspace == "production" ? "production" : "staging"}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
}

resource "scaleway_job_definition" "analytics-stat-event" {
  name         = "analytics-${terraform.workspace}-stat-event"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_analytics_uri
  timeout      = "120m"

  cron {
    schedule = "0 3 * * *" # Every day at 3:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw stat_event"
  })
}

resource "scaleway_job_definition" "analytics-moderation-event" {
  name         = "analytics-${terraform.workspace}-moderation-event"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_analytics_uri
  timeout      = "120m"

  cron {
    schedule = "0 3 * * *" # Every day at 3:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw moderation_event"
  })
}

resource "scaleway_job_definition" "analytics-email" {
  name         = "analytics-${terraform.workspace}-email"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_analytics_uri
  timeout      = "120m"

  cron {
    schedule = "0 3 * * *" # Every day at 3:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw email"
  })
}

resource "scaleway_job_definition" "analytics-dbt-run" {
  name         = "analytics-${terraform.workspace}-dbt-run"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_analytics_uri
  timeout      = "120m"

  cron {
    schedule = "0 5 * * *" # Every day at 5:00 AM
    timezone = "Europe/Paris"
  }

  env = merge(local.common_analytics_env_vars, {
    JOB_CMD = "sh scripts/dbt-env.sh run"
  })
}

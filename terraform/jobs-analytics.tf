locals {
  common_analytics_env_vars = {
    "ENV"                     = terraform.workspace
    "DATABASE_URL_CORE"       = local.secrets.DATABASE_URL_CORE
    "DATABASE_URL_ANALYTICS"  = local.secrets.DATABASE_URL_ANALYTICS
    "METABASE_DATABASE_NAME"  = local.secrets.METABASE_DATABASE_NAME
    "METABASE_URL"            = local.secrets.METABASE_URL
    "METABASE_API_KEY"        = local.secrets.METABASE_API_KEY
    "SENTRY_DSN_JOBS"         = local.secrets.SENTRY_DSN_JOBS
    "SLACK_TOKEN"             = local.secrets.SLACK_TOKEN
    "SLACK_CRON_CHANNEL_ID"   = local.secrets.SLACK_CRON_CHANNEL_ID
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

resource "scaleway_job_definition" "analytics-mission-event" {
  name         = "analytics-${terraform.workspace}-mission-event"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_event"
  })
}

resource "scaleway_job_definition" "analytics-publisher" {
  name         = "analytics-${terraform.workspace}-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw publisher"
  })
}

resource "scaleway_job_definition" "analytics-organization" {
  name         = "analytics-${terraform.workspace}-organization"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw organization"
  })
}

resource "scaleway_job_definition" "analytics-import" {
  name         = "analytics-${terraform.workspace}-import"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw import"
  })
}

resource "scaleway_job_definition" "analytics-publisher-diffusion-exclusion" {
  name         = "analytics-${terraform.workspace}-publisher-diffusion-exclusion"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw publisher_diffusion_exclusion"
  })
}

resource "scaleway_job_definition" "analytics-user" {
  name         = "analytics-${terraform.workspace}-user"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw user"
  })
}

resource "scaleway_job_definition" "analytics-user-publisher" {
  name         = "analytics-${terraform.workspace}-user-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw user_publisher"
  })
}

resource "scaleway_job_definition" "analytics-login-history" {
  name         = "analytics-${terraform.workspace}-login-history"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw login_history"
  })
}

resource "scaleway_job_definition" "analytics-campaign" {
  name         = "analytics-${terraform.workspace}-campaign"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw campaign"
  })
}

resource "scaleway_job_definition" "analytics-campaign-tracker" {
  name         = "analytics-${terraform.workspace}-campaign-tracker"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw campaign_tracker"
  })
}

resource "scaleway_job_definition" "analytics-widget" {
  name         = "analytics-${terraform.workspace}-widget"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget"
  })
}

resource "scaleway_job_definition" "analytics-widget-publisher" {
  name         = "analytics-${terraform.workspace}-widget-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget_publisher"
  })
}

resource "scaleway_job_definition" "analytics-widget-rule" {
  name         = "analytics-${terraform.workspace}-widget-rule"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget_rule"
  })
}

resource "scaleway_job_definition" "analytics-mission" {
  name         = "analytics-${terraform.workspace}-mission"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission"
  })
}

resource "scaleway_job_definition" "analytics-domain" {
  name         = "analytics-${terraform.workspace}-domain"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw domain"
  })
}

resource "scaleway_job_definition" "analytics-activity" {
  name         = "analytics-${terraform.workspace}-activity"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw activity"
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

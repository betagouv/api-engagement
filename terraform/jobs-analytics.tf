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
  }

  image_analytics_uri = "ghcr.io/${var.github_repository}/analytics:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
}

resource "scaleway_job_definition" "analytics-stat-event" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-stat-event"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw stat_event"
  })
}

resource "scaleway_job_definition" "analytics-moderation-event" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-moderation-event"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw moderation_event"
  })
}

resource "scaleway_job_definition" "analytics-email" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-email"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw email"
  })
}

resource "scaleway_job_definition" "analytics-mission-event" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission-event"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_event"
  })
}

resource "scaleway_job_definition" "analytics-mission-address" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission-address"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_address"
  })
}

resource "scaleway_job_definition" "analytics-publisher" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw publisher"
  })
}

resource "scaleway_job_definition" "analytics-publisher-organization" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-publisher-organization"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw publisher_organization"
  })
}

resource "scaleway_job_definition" "analytics-organization" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-organization"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw organization"
  })
}

resource "scaleway_job_definition" "analytics-import" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-import"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw import"
  })
}

resource "scaleway_job_definition" "analytics-publisher-diffusion-exclusion" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-publisher-diffusion-exclusion"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw publisher_diffusion_exclusion"
  })
}

resource "scaleway_job_definition" "analytics-user" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-user"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw user"
  })
}

resource "scaleway_job_definition" "analytics-user-publisher" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-user-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw user_publisher"
  })
}

resource "scaleway_job_definition" "analytics-login-history" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-login-history"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw login_history"
  })
}

resource "scaleway_job_definition" "analytics-campaign" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-campaign"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw campaign"
  })
}

resource "scaleway_job_definition" "analytics-campaign-tracker" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-campaign-tracker"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw campaign_tracker"
  })
}

resource "scaleway_job_definition" "analytics-widget" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-widget"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget"
  })
}

resource "scaleway_job_definition" "analytics-widget-publisher" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-widget-publisher"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget_publisher"
  })
}

resource "scaleway_job_definition" "analytics-widget-rule" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-widget-rule"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw widget_rule"
  })
}

resource "scaleway_job_definition" "analytics-mission" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission"
  })
}

resource "scaleway_job_definition" "analytics-domain" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-domain"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw domain"
  })
}

resource "scaleway_job_definition" "analytics-activity" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-activity"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw activity"
  })
}

resource "scaleway_job_definition" "analytics-mission-activity" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission-activity"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_activity"
  })
}

resource "scaleway_job_definition" "analytics-mission-moderation-status" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission-moderation-status"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_moderation_status"
  })
}

resource "scaleway_job_definition" "analytics-mission-jobboard" {
  count                  = var.enable_analytics_jobs ? 1 : 0
  name                   = "analytics-${var.env}-mission-jobboard"
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
    JOB_CMD = "node dist/jobs/run-job.js export-to-analytics-raw mission_jobboard"
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

locals {
  common_env_vars = {
    "ENV"                        = terraform.workspace
    "API_URL"                    = "https://${local.api_hostname}"
    "APP_URL"                    = "https://${local.app_hostname}"
    "BENEVOLAT_URL"              = "https://${local.benevolat_hostname}"
    "VOLONTARIAT_URL"            = "https://${local.volontariat_hostname}"
    "BUCKET_NAME"                = local.bucket_name
    "SLACK_JOBTEASER_CHANNEL_ID" = terraform.workspace == "production" ? "C080H9MH56W" : ""
  }

  all_env_vars = merge(
    local.common_env_vars,
    tomap(local.secrets)
  )

  image_uri = "ghcr.io/${var.github_repository}/api-jobs:${terraform.workspace == "production" ? "production" : "staging"}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
}

# Job Definition for the 'letudiant' task
resource "scaleway_job_definition" "letudiant" {
  name         = "${terraform.workspace}-letudiant"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  # Max old space workaround: https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js letudiant"
  timeout      = "45m"

  cron {
    schedule = "0 */3 * * *" # Every 3 hours
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'linkedin' task
resource "scaleway_job_definition" "linkedin" {
  name         = "${terraform.workspace}-linkedin"
  project_id   = var.project_id
  cpu_limit    = 1500
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js linkedin"
  timeout      = "30m"

  cron {
    schedule = "0 */6 * * *" # Every 6 hours
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'kpi' task
resource "scaleway_job_definition" "kpi" {
  name         = "${terraform.workspace}-kpi"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js kpi"
  timeout      = "15m"

  cron {
    schedule = "30 1 * * *" # Every day at 1:30 AM
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Defition for the 'import-organizations' task
resource "scaleway_job_definition" "import-organizations" {
  name         = "${terraform.workspace}-import-organizations"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js import-organizations"
  timeout      = "45m"

  cron {
    schedule = "0 0 2 * *" # At 00:00 on day-of-month 2
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'warnings' task
resource "scaleway_job_definition" "warnings" {
  name         = "${terraform.workspace}-warnings"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js warnings"
  timeout      = "15m"

  cron {
    schedule = "30 */3 * * *" # Every 3 hours at 30 minutes
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'linkedin-stats' task
resource "scaleway_job_definition" "linkedin-stats" {
  name         = "${terraform.workspace}-linkedin-stats"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js linkedin-stats"
  timeout      = "15m"

  cron {
    schedule = "0 9 * * 5" # Every friday at 09:00 AM
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'leboncoin' task
resource "scaleway_job_definition" "leboncoin" {
  name         = "${terraform.workspace}-leboncoin"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js leboncoin"
  timeout      = "15m"

  cron {
    schedule = "0 10 * * *" # Every 3 hours at 30 minutes
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'brevo' task
resource "scaleway_job_definition" "brevo" {
  name         = "${terraform.workspace}-brevo"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js brevo"
  timeout      = "15m"

  cron {
    schedule = "0 1 * * *" # Every day at 1 AM
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'moderation' task
resource "scaleway_job_definition" "moderation" {
  name         = "${terraform.workspace}-moderation"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js moderation"
  timeout      = "15m"

  cron {
    schedule = "0 */3 * * *" # Every 3 hours
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

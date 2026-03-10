locals {
  common_env_vars = {
    "ENV"                        = var.env
    "API_URL"                    = "https://${var.api_hostname}"
    "APP_URL"                    = "https://${var.app_hostname}"
    "BENEVOLAT_URL"              = var.benevolat_hostname != "" ? "https://${var.benevolat_hostname}" : ""
    "VOLONTARIAT_URL"            = var.volontariat_hostname != "" ? "https://${var.volontariat_hostname}" : ""
    "BUCKET_NAME"                = var.bucket_name
    "SLACK_JOBTEASER_CHANNEL_ID" = var.slack_jobteaser_channel_id
    "PRISMA_POOL_SIZE_CORE"      = "8"
    "PRISMA_POOL_TIMEOUT"        = "20"
    "PRISMA_CONNECT_TIMEOUT"     = "10"
  }

  all_env_vars = merge(
    local.common_env_vars,
    tomap(local.secrets)
  )

  image_uri              = "ghcr.io/${var.github_repository}/api:${var.env}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  sync_sandbox_image_uri = "ghcr.io/${var.github_repository}/sync-sandbox:production-latest"
}

# Job Definition for the 'letudiant' task
# resource "scaleway_job_definition" "letudiant" {
#   count        = var.enable_intern_jobs ? 1 : 0
#   name         = "${var.env}-letudiant"
#   project_id   = var.project_id
#   cpu_limit    = 1000
#   memory_limit = 2048
#   image_uri    = local.image_uri
#   # Max old space workaround: https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js
#   command      = "node --max-old-space-size=1800 dist/jobs/run-job.js letudiant"
#   timeout      = "45m"
#
#   cron {
#     schedule = "0 */3 * * *" # Every 3 hours
#     timezone = "Europe/Paris"
#   }
#
#   env = local.all_env_vars
# }

# Job Definition for the 'talent' task
resource "scaleway_job_definition" "talent" {
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-talent"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  # Max old space workaround: https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js talent"
  timeout      = "45m"

  cron {
    schedule = "0 */3 * * *" # Every 3 hours
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'grimpio' task
resource "scaleway_job_definition" "grimpio" {
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-grimpio"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  # Max old space workaround: https://stackoverflow.com/questions/48387040/how-do-i-determine-the-correct-max-old-space-size-for-node-js
  command      = "node --max-old-space-size=1800 dist/jobs/run-job.js grimpio"
  timeout      = "45m"

  cron {
    schedule = "0 1 * * *" # Every day at 1:00 AM
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'linkedin' task
resource "scaleway_job_definition" "linkedin" {
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-linkedin"
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

# Job Definition for the 'import-organizations' task
resource "scaleway_job_definition" "import-organizations" {
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-import-organizations"
  project_id   = var.project_id
  cpu_limit    = 2000
  memory_limit = 4096
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
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-warnings"
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
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-linkedin-stats"
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
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-leboncoin"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js leboncoin"
  timeout      = "15m"

  cron {
    schedule = "0 10 * * *" # Every day at 10:00 AM
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'brevo' task
resource "scaleway_job_definition" "brevo" {
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-brevo"
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
  count        = var.enable_intern_jobs ? 1 : 0
  name         = "${var.env}-moderation"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js moderation"
  timeout      = "15m"

  cron {
    schedule = "55 */3 * * *" # Every 3 hours at 55 minutes (after import-missions)
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'enrich-missions-geoloc' task
resource "scaleway_job_definition" "enrich-missions-geoloc" {
  name         = "${terraform.workspace}-enrich-missions-geoloc"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js enrich-missions-geoloc"
  timeout      = "30m"

  cron {
    schedule = "30 */2 * * *" # Every 2 hours at 30 minutes (after import-missions)
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'import-missions' task (all environments)
resource "scaleway_job_definition" "import-missions" {
  name         = "${var.env}-import-missions"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js import-missions"
  timeout      = "60m"

  cron {
    schedule = "15 */6 * * *" # Every 6 hours at 15 minutes
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'verify-publisher-organization' task
resource "scaleway_job_definition" "verify-publisher-organization" {
  name         = "${terraform.workspace}-verify-publisher-organization"
  project_id   = var.project_id
  cpu_limit    = 1000
  memory_limit = 2048
  image_uri    = local.image_uri
  command      = "node dist/jobs/run-job.js verify-publisher-organization"
  timeout      = "60m"

  cron {
    schedule = "45 */6 * * *" # Every 6 hours at 45 minutes
    timezone = "Europe/Paris"
  }

  env = local.all_env_vars
}

# Job Definition for the 'letudiant' task
resource "scaleway_job_definition" "letudiant" {
  name         = "${terraform.workspace}-letudiant"
  project_id   = var.project_id
  cpu_limit    = 500
  memory_limit = 1024
  image_uri    = "ghcr.io/${var.github_repository}/api-jobs:${terraform.workspace == "production" ? "production": "staging"}${var.image_tag == "latest" ? "" : "-${var.image_tag}"}"
  command      = "node dist/jobs/run-job.js letudiant"
  timeout      = "15m"

  cron {
    schedule = "0 */3 * * *" # Every 3 hours
    timezone = "Europe/Paris"
  }

  env = merge(
    {
      "ENV"                        = terraform.workspace
      "API_URL"                    = "https://${local.api_hostname}"
      "APP_URL"                    = "https://${local.app_hostname}"
      "BENEVOLAT_URL"              = "https://${local.benevolat_hostname}"
      "VOLONTARIAT_URL"            = "https://${local.volontariat_hostname}"
      "BUCKET_NAME"                = local.bucket_name
      "SLACK_JOBTEASER_CHANNEL_ID" = terraform.workspace == "production" ? "C080H9MH56W" : ""
    },
    tomap(local.secrets)
  )
}

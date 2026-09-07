# Fonction sentry-webhook : relais Sentry self-hosted → Slack. Une seule fonction pour tous
# les environnements, déployée par le workspace production : elle choisit le channel selon
# l'environnement de l'événement Sentry. Le bundle est construit avant le plan (CI ou local) :
# voir functions/README.md.

data "archive_file" "sentry_webhook" {
  count = local.deploy_sentry_webhook ? 1 : 0

  type        = "zip"
  source_file = "${path.module}/build/sentry-webhook/handler.mjs"
  output_path = "${path.module}/build/sentry-webhook.zip"
}

resource "scaleway_function_namespace" "functions" {
  count = local.deploy_sentry_webhook ? 1 : 0

  name        = "${var.workspace}-functions"
  description = "${var.workspace} functions namespace"
  project_id  = var.project_id
}

resource "scaleway_function" "sentry_webhook" {
  count = local.deploy_sentry_webhook ? 1 : 0

  name         = "sentry-webhook"
  description  = "Relais Sentry → Slack"
  namespace_id = scaleway_function_namespace.functions[0].id
  runtime      = "node22"
  handler      = "handler.handle"
  privacy      = "public"
  http_option  = "redirected"
  memory_limit = 128
  min_scale    = 0
  max_scale    = 1
  deploy       = true
  zip_file     = data.archive_file.sentry_webhook[0].output_path
  zip_hash     = data.archive_file.sentry_webhook[0].output_sha256

  environment_variables = {
    "SLACK_CHANNEL_ID_PRODUCTION" = var.sentry_slack_channel_id_production
    "SLACK_CHANNEL_ID_STAGING"    = var.sentry_slack_channel_id_staging
  }

  secret_environment_variables = {
    "SLACK_TOKEN" = local.secrets.SLACK_TOKEN
  }
}

output "sentry_webhook_endpoint" {
  value = local.deploy_sentry_webhook ? (var.sentry_webhook_hostname != "" ? "https://${var.sentry_webhook_hostname}" : "https://${scaleway_function.sentry_webhook[0].domain_name}") : ""
}

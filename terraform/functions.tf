# Fonction sentry-webhook : relais Sentry self-hosted → Slack, une fonction par workspace.
# Le channel de destination est fourni par SLACK_CHANNEL_ID (le sandbox pointe sur le même
# channel que la production). Le bundle est construit avant le plan (CI ou local) : voir
# functions/README.md.

data "archive_file" "sentry_webhook" {
  count = var.enable_sentry_webhook ? 1 : 0

  type        = "zip"
  source_file = "${path.module}/build/sentry-webhook/handler.mjs"
  output_path = "${path.module}/build/sentry-webhook.zip"
}

resource "scaleway_function_namespace" "functions" {
  count = var.enable_sentry_webhook ? 1 : 0

  name        = "${var.workspace}-functions"
  description = "${var.workspace} functions namespace"
  project_id  = var.project_id
}

resource "scaleway_function" "sentry_webhook" {
  count = var.enable_sentry_webhook ? 1 : 0

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
    "SLACK_CHANNEL_ID" = var.sentry_slack_channel_id
  }

  secret_environment_variables = {
    "SLACK_TOKEN" = local.secrets.SLACK_TOKEN
  }
}

output "sentry_webhook_endpoint" {
  value = var.enable_sentry_webhook ? (var.sentry_webhook_hostname != "" ? "https://${var.sentry_webhook_hostname}" : "https://${scaleway_function.sentry_webhook[0].domain_name}") : ""
}

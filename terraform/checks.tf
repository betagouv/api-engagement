# Garde-fous sur la configuration : le plan échoue si une valeur obligatoire manque, au lieu
# de déployer un service avec une variable vide (Sentry, Slack… désactivés sans bruit).

locals {
  # Clés obligatoires du secret Scaleway "<workspace>-secret", selon les services activés.
  required_secrets = concat(
    ["SECRET", "DATABASE_URL_CORE", "SENDINBLUE_APIKEY", "BREVO_WEBHOOK_TOKEN", "SLACK_TOKEN", "SCW_ACCESS_KEY", "SCW_SECRET_KEY"],
    var.enable_typesense ? ["TYPESENSE_API_KEY"] : [],
    var.enable_plateform ? ["PLATEFORM_PUBLISHER_API_KEY"] : [],
    var.enable_analytics_jobs ? ["DATABASE_URL_ANALYTICS"] : [],
    var.enable_sentry_webhook ? ["SENTRY_CLIENT_SECRET"] : [],
  )
  missing_secrets = [for key in local.required_secrets : key if lookup(local.secrets, key, "") == ""]

  # Variables GitHub de l'environnement (vars.*) obligatoires, selon les services activés.
  missing_github_vars = compact([
    var.sentry_dsn_api == "" ? "SENTRY_DSN_API" : "",
    var.enable_widget && var.sentry_dsn_widget == "" ? "SENTRY_DSN_WIDGET" : "",
    (var.enable_intern_jobs || var.enable_analytics_jobs) && var.sentry_dsn_jobs == "" ? "SENTRY_DSN_JOBS" : "",
  ])

  # Un DSN qui ne pointe pas vers l'instance Sentry du projet (ex. l'ancien sentry.api-engagement.beta.gouv.fr).
  sentry_dsns = {
    "SENTRY_DSN_API"    = var.sentry_dsn_api
    "SENTRY_DSN_JOBS"   = var.sentry_dsn_jobs
    "SENTRY_DSN_WIDGET" = var.sentry_dsn_widget
  }
  invalid_sentry_dsns = [for name, value in local.sentry_dsns : name if value != "" && !can(regex("^https://[0-9a-f]+@sentry\\.incubateur\\.net/[0-9]+$", value))]

  # Clés optionnelles : leur absence désactive une fonctionnalité, signalée en warning au plan.
  optional_secrets = [
    "LETUDIANT_PILOTY_TOKEN", "METABASE_URL", "METABASE_API_KEY", "METABASE_DATABASE_NAME", "COCKPIT_METRICS_OTLP_URL", "COCKPIT_METRICS_TOKEN",
    "DEMARCHES_SIMPLIFIEES_TOKEN", "MISTRAL_API_KEY", "ALBERT_API_KEY", "SLACK_CRON_CHANNEL_ID", "POSTHOG_HOST", "POSTHOG_PROJECT_ID", "POSTHOG_API_KEY",
  ]
  missing_optional_secrets = [for key in local.optional_secrets : key if lookup(local.secrets, key, "") == ""]
}

resource "terraform_data" "required_configuration" {
  lifecycle {
    precondition {
      condition     = length(local.missing_secrets) == 0
      error_message = "Missing keys in Scaleway secret \"${var.workspace}-secret\": ${join(", ", local.missing_secrets)}"
    }
    precondition {
      condition     = length(local.missing_github_vars) == 0
      error_message = "Missing GitHub variables in environment \"${var.workspace}\": ${join(", ", local.missing_github_vars)}"
    }
    precondition {
      condition     = length(local.invalid_sentry_dsns) == 0
      error_message = "GitHub variables in environment \"${var.workspace}\" must be sentry.incubateur.net DSNs (https://<key>@sentry.incubateur.net/<project-id>): ${join(", ", local.invalid_sentry_dsns)}"
    }
  }
}

check "optional_secrets" {
  assert {
    condition     = length(local.missing_optional_secrets) == 0
    error_message = "Optional keys missing in Scaleway secret \"${var.workspace}-secret\" (related features disabled): ${join(", ", local.missing_optional_secrets)}"
  }
}

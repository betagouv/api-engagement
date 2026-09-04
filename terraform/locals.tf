locals {
  secrets = jsondecode(base64decode(data.scaleway_secret_version.main.data))

  # Une seule fonction sentry-webhook pour tous les projets Sentry : elle n'est déployée
  # que par le workspace production, jamais en staging ni en sandbox.
  deploy_sentry_webhook = var.workspace == "production"
}

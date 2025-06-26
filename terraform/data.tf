data "scaleway_secret" "main" {
  name       = terraform.workspace == "production" ? "production-secret" : "staging-secret"
  project_id = var.project_id
}

data "scaleway_secret_version" "main" {
  secret_id = data.scaleway_secret.main.id
  revision  = "latest_enabled"
}

locals {
  api_hostname         = terraform.workspace == "production" ? "api.api-engagement.beta.gouv.fr" : "api.api-engagement-dev.fr"
  app_hostname         = terraform.workspace == "production" ? "app.api-engagement.beta.gouv.fr" : "app.api-engagement-dev.fr"
  benevolat_hostname   = terraform.workspace == "production" ? "mission.api-engagement.beta.gouv.fr" : "mission.api-engagement-dev.fr"
  volontariat_hostname = terraform.workspace == "production" ? "sc.api-engagement.beta.gouv.fr" : "sc.api-engagement-dev.fr"
  process_hostname     = terraform.workspace == "production" ? "process.api-engagement.beta.gouv.fr" : "process.api-engagement-dev.fr"
  bucket_name          = terraform.workspace == "production" ? "api-engagement-bucket" : "api-engagement-bucket-staging"
  secrets              = jsondecode(base64decode(data.scaleway_secret_version.main.data))
}

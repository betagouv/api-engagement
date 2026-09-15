locals {
  secrets = jsondecode(base64decode(data.scaleway_secret_version.main.data))
}

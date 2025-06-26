# https://registry.terraform.io/providers/scaleway/scaleway/latest/docs

terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.55.0"
    }
  }
  backend "s3" {
    bucket                      = "api-engagement-terraform-state"
    key                         = "terraform.tfstate"
    region                      = "fr-par"
    endpoint                    = "https://s3.fr-par.scw.cloud"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
  }

  required_version = ">= 1.0.0"
}

provider "scaleway" {
  zone   = "fr-par-1"
  region = "fr-par"
}

# Containers namespace
resource "scaleway_container_namespace" "main" {
  name        = terraform.workspace
  description = "${terraform.workspace} namespace"
  project_id  = var.project_id
}

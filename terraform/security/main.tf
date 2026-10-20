terraform {
  required_version = ">= 1.10.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.84.0"
    }
  }

  # Configuration indépendante de terraform/main.tf.
  # Le backend est renseigné avec terraform init -backend-config.
  backend "s3" {}
}

provider "scaleway" {
  project_id = var.security_project_id
  region     = var.region
  zone       = var.zone
}

terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
}

resource "scaleway_mnq_sqs_queue" "this" {
  project_id = var.project_id
  name       = var.name
  access_key = var.access_key
  secret_key = var.secret_key
}

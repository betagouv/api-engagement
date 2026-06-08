terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
}

resource "scaleway_mnq_sqs_queue" "dlq" {
  project_id      = var.project_id
  name            = "${var.name}-dlq"
  access_key      = var.access_key
  secret_key      = var.secret_key
  message_max_age = 1209600
}


resource "scaleway_mnq_sqs_queue" "this" {
  project_id                 = var.project_id
  name                       = var.name
  access_key                 = var.access_key
  secret_key                 = var.secret_key
  visibility_timeout_seconds = 65
  dead_letter_queue {
    id                = scaleway_mnq_sqs_queue.dlq.id
    max_receive_count = 10
  }
}

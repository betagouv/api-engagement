resource "scaleway_mnq_sqs" "main" {
  project_id = var.project_id
}

resource "scaleway_mnq_sqs_credentials" "async_task_manager" {
  project_id = scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-manager"

  permissions {
    can_manage  = true
    can_receive = false
    can_publish = true
  }
}

resource "scaleway_mnq_sqs_credentials" "async_task_publisher" {
  project_id = scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-publisher"

  permissions {
    can_manage  = false
    can_receive = false
    can_publish = true
  }
}

locals {
  async_task_queues = {
    mission_enrichment = {
      task_type = "mission.enrichment"
      name      = "${var.workspace}-mission-enrichment"
    }
    mission_scoring = {
      task_type = "mission.scoring"
      name      = "${var.workspace}-mission-scoring"
    }
  }
}

module "async_task_queues" {
  for_each = local.async_task_queues

  source = "./modules/mnq-sqs-queue"

  project_id = var.project_id
  name       = each.value.name
  access_key = scaleway_mnq_sqs_credentials.async_task_manager.access_key
  secret_key = scaleway_mnq_sqs_credentials.async_task_manager.secret_key
}

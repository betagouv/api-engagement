resource "scaleway_mnq_sqs" "main" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = var.project_id
}

resource "scaleway_mnq_sqs_credentials" "async_task_manager" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = scaleway_mnq_sqs.main[0].project_id
  name       = "${var.workspace}-async-task-manager"

  permissions {
    can_manage  = true
    can_receive = false
    can_publish = true
  }
}

resource "scaleway_mnq_sqs_credentials" "async_task_publisher" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = scaleway_mnq_sqs.main[0].project_id
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
  for_each = var.enable_async_tasks ? local.async_task_queues : {}

  source = "./modules/mnq-sqs-queue"

  project_id = var.project_id
  name       = each.value.name
  access_key = scaleway_mnq_sqs_credentials.async_task_manager[0].access_key
  secret_key = scaleway_mnq_sqs_credentials.async_task_manager[0].secret_key
}

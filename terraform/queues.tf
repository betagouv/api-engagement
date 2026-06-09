data "scaleway_mnq_sqs" "main" {
  project_id = var.project_id
}

resource "scaleway_mnq_sqs_credentials" "async_task_manager" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = data.scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-manager"

  permissions {
    can_manage  = true
    can_receive = false
    can_publish = true
  }
}

resource "scaleway_mnq_sqs_credentials" "async_task_publisher" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = data.scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-publisher"

  permissions {
    can_manage  = false
    can_receive = false
    can_publish = true
  }
}

resource "scaleway_mnq_sqs_credentials" "async_task_trigger" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = data.scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-trigger"

  permissions {
    can_manage  = false
    can_receive = true
    can_publish = false
  }
}

# DLQ replay job credentials: reads the DLQ (receive) and republishes it to the source queue (publish)
resource "scaleway_mnq_sqs_credentials" "async_task_dlq_processor" {
  count      = var.enable_async_tasks ? 1 : 0
  project_id = data.scaleway_mnq_sqs.main.project_id
  name       = "${var.workspace}-async-task-dlq-processor"

  permissions {
    can_manage  = false
    can_receive = true
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
    mission_index = {
      task_type = "mission.index"
      name      = "${var.workspace}-mission-index"
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

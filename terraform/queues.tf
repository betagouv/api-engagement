# ⚠️ NE PAS reconvertir en `resource "scaleway_mnq_sqs"`.
#
# L'activation MNQ SQS est un SINGLETON PAR PROJET. Or staging et production
# partagent le MÊME projet Scaleway (seuls les workspaces Terraform diffèrent),
# donc une `resource` provoque un `409 Conflict: resource already exists` dès
# que le 2ᵉ workspace s'applique (cf. PR #1047).
#
# Conséquence : l'activation SQS est volontairement gérée HORS Terraform (bootstrap
# manuel unique par projet). À refaire uniquement sur un projet neuf :
#   scw mnq sqs activate region=fr-par project-id=<PROJECT_ID>
# Un `data` source ne fait que lire le statut ; il ne (dé)active jamais. Repasser en
# `resource` ré-introduirait le 409 ET, au retrait, désactiverait SQS pour TOUT le
# projet (suppression de toutes les queues + credentials, staging comme prod).
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

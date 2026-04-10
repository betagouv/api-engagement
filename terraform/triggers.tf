resource "scaleway_container_trigger" "api_worker_async_tasks" {
  for_each = var.enable_async_tasks ? local.async_task_queues : {}

  container_id = scaleway_container.api_worker[0].id
  name         = "${each.value.name}-trigger"
  description  = "Trigger ${each.value.task_type} for API worker"

  sqs {
    project_id = scaleway_mnq_sqs.main[0].project_id
    queue      = module.async_task_queues[each.key].name
    region     = "fr-par"
  }
}

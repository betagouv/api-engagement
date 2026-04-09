resource "scaleway_container_trigger" "api_worker_async_tasks" {
  for_each = local.async_task_queues

  container_id = scaleway_container.api_worker.id
  name         = "${each.value.name}-trigger"
  description  = "Trigger ${each.value.task_type} for API worker"

  sqs {
    project_id = scaleway_mnq_sqs.main.project_id
    queue      = module.async_task_queues[each.key].name
    region     = "fr-par"
  }
}

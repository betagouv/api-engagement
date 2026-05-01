workspace = "poc"
env       = "poc"

api_hostname      = ""
poc_quiz_hostname = ""
app_hostname      = ""
bucket_name       = "api-engagement-bucket-poc"

api_cpu_limit    = 250
api_memory_limit = 512
api_min_scale    = 1
api_max_scale    = 1

private_network_cidr = "10.43.0.0/22"

enable_public_gateway = true
enable_app            = false
enable_widget         = false
enable_async_tasks    = true
enable_intern_jobs    = false
enable_analytics_jobs = false
enable_mission_jobs   = false
enable_poc_quiz       = true
enable_plateform      = true
plateform_hostname    = ""
enable_typesense      = true

typesense_load_balancer_private_ip = "10.43.2.10"
typesense_nodes = {
  node-1 = {
    zone              = "fr-par-1"
    private_ip        = "10.43.2.11"
    instance_type     = "PLAY2-PICO"
    typesense_version = "30.2"
  }
}

workspace                  = "staging"
env                        = "staging"

api_hostname               = "api.api-engagement-dev.fr"
app_hostname               = "app.api-engagement-dev.fr"
benevolat_hostname         = "mission.api-engagement-dev.fr"
volontariat_hostname       = "sc.api-engagement-dev.fr"
piloty_hostname            = "sandbox-api.piloty.fr"
bucket_name                = "api-engagement-bucket-staging"
slack_jobteaser_channel_id = ""

api_cpu_limit              = 250
api_memory_limit           = 512
api_min_scale              = 1
api_max_scale              = 1

app_cpu_limit              = 250
app_memory_limit           = 512
app_min_scale              = 0
app_max_scale              = 1

widget_cpu_limit           = 250
widget_memory_limit        = 512
widget_min_scale           = 0
widget_max_scale           = 1

enable_widget              = true
enable_intern_jobs         = true
enable_analytics_jobs      = true
enable_typesense           = true
enable_public_gateway      = true

private_network_cidr       = "10.41.0.0/22"

enable_plateform           = true
# plateform_hostname         = "plateform.api-engagement-dev.fr"

typesense_load_balancer_private_ip = "10.41.2.10"

typesense_nodes = {
  node-1 = {
    zone              = "fr-par-1"
    private_ip        = "10.41.2.11"
    instance_type     = "PLAY2-PICO"
    typesense_version = "30.2"
  }
}

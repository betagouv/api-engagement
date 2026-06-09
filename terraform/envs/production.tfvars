workspace = "production"
env       = "production"

api_hostname               = "api.api-engagement.beta.gouv.fr"
app_hostname               = "app.api-engagement.beta.gouv.fr"
benevolat_hostname         = "mission.api-engagement.beta.gouv.fr"
volontariat_hostname       = "sc.api-engagement.beta.gouv.fr"
piloty_hostname            = "api.piloty.fr"
bucket_name                = "api-engagement-bucket"
slack_jobteaser_channel_id = "C080H9MH56W"
core_database_id           = "9a0421d5-c618-4d88-956b-3f758ab9aa0e"

api_cpu_limit    = 1500
api_memory_limit = 2048
api_min_scale    = 1
api_max_scale    = 4

app_cpu_limit    = 500
app_memory_limit = 1024
app_min_scale    = 1
app_max_scale    = 1

widget_cpu_limit    = 500
widget_memory_limit = 1024
widget_min_scale    = 1
widget_max_scale    = 2

enable_widget         = true
enable_intern_jobs    = true
enable_analytics_jobs = true
enable_rdb_backup_job = true
enable_typesense      = true
enable_public_gateway = true

enable_plateform   = true
plateform_hostname = "plateforme.api-engagement.beta.gouv.fr"

private_network_cidr = "10.40.0.0/22"

typesense_load_balancer_private_ip = "10.40.2.10"
typesense_nodes = {
  node-1 = {
    zone              = "fr-par-1"
    private_ip        = "10.40.2.11"
    instance_type     = "PLAY2-PICO"
    typesense_version = "30.2"
  },
  node-2 = {
    zone              = "fr-par-2"
    private_ip        = "10.40.2.12"
    instance_type     = "PLAY2-PICO"
    typesense_version = "30.2"
  },
  node-3 = {
    zone              = "fr-par-2"
    private_ip        = "10.40.2.13"
    instance_type     = "PLAY2-PICO"
    typesense_version = "30.2"
  }
}

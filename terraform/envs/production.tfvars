workspace                  = "production"
env                        = "production"

api_hostname               = "api.api-engagement.beta.gouv.fr"
app_hostname               = "app.api-engagement.beta.gouv.fr"
benevolat_hostname         = "mission.api-engagement.beta.gouv.fr"
volontariat_hostname       = "sc.api-engagement.beta.gouv.fr"
piloty_hostname            = "api.piloty.fr"
bucket_name                = "api-engagement-bucket"
slack_jobteaser_channel_id = "C080H9MH56W"
cockpit_metrics_otlp_url   = "https://4cf96773-b69e-4c42-81ed-940b78886deb.metrics.cockpit.fr-par.scw.cloud/otlp/v1/metrics"
core_database_id           = "9a0421d5-c618-4d88-956b-3f758ab9aa0e"

api_cpu_limit              = 1500
api_memory_limit           = 2048
api_min_scale              = 1
api_max_scale              = 4

app_cpu_limit              = 500
app_memory_limit           = 1024
app_min_scale              = 1
app_max_scale              = 1

widget_cpu_limit           = 500
widget_memory_limit        = 1024
widget_min_scale           = 1
widget_max_scale           = 2

enable_widget              = true
enable_intern_jobs         = true
enable_analytics_jobs      = true

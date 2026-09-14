resource "scaleway_container_domain" "api" {
  count        = var.api_hostname != "" ? 1 : 0
  container_id = scaleway_container.api.id
  hostname     = var.api_hostname
}

resource "scaleway_container_domain" "app" {
  count        = var.enable_app && var.app_hostname != "" ? 1 : 0
  container_id = scaleway_container.app[0].id
  hostname     = var.app_hostname
}

resource "scaleway_container_domain" "plateform" {
  count        = var.enable_plateform && var.plateform_hostname != "" ? 1 : 0
  container_id = scaleway_container.plateform[0].id
  hostname     = var.plateform_hostname
}

resource "scaleway_function_domain" "sentry_webhook" {
  count       = local.deploy_sentry_webhook && var.sentry_webhook_hostname != "" ? 1 : 0
  function_id = scaleway_function.sentry_webhook[0].id
  hostname    = var.sentry_webhook_hostname
}

# Widget is linked to both volontariat and benevolat domains
resource "scaleway_container_domain" "volontariat" {
  count        = var.enable_widget ? 1 : 0
  container_id = scaleway_container.widget[0].id
  hostname     = var.volontariat_hostname
}

resource "scaleway_container_domain" "benevolat" {
  count        = var.enable_widget ? 1 : 0
  container_id = scaleway_container.widget[0].id
  hostname     = var.benevolat_hostname
}

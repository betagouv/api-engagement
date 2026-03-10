resource "scaleway_container_domain" "api" {
  container_id = scaleway_container.api.id
  hostname     = var.api_hostname
}

resource "scaleway_container_domain" "app" {
  container_id = scaleway_container.app.id
  hostname     = var.app_hostname
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

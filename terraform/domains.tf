resource "scaleway_container_domain" "app" {
  container_id = scaleway_container.app.id
  hostname     = local.app_hostname
}

resource "scaleway_container_domain" "process" {
  container_id = scaleway_container.process.id
  hostname     = local.process_hostname
}

# Widget is linked to both volontariat and benevolat domains
resource "scaleway_container_domain" "volontariat" {
  container_id = scaleway_container.widget.id
  hostname     = local.volontariat_hostname
}
resource "scaleway_container_domain" "benevolat" {
  container_id = scaleway_container.widget.id
  hostname     = local.benevolat_hostname
}

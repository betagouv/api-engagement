resource "scaleway_container_domain" "api" {
  count        = var.api_hostname != "" ? 1 : 0
  container_id = scaleway_container.api.id
  hostname     = var.api_hostname
}

resource "scaleway_container_domain" "app" {
  count        = var.enable_app ? 1 : 0
  container_id = scaleway_container.app[0].id
  hostname     = var.app_hostname
}

resource "scaleway_container_domain" "poc_quiz" {
  count        = var.enable_poc_quiz && var.poc_quiz_hostname != "" ? 1 : 0
  container_id = scaleway_container.poc_quiz[0].id
  hostname     = var.poc_quiz_hostname
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

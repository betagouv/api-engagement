# L'adresse publique d'entrée est distincte de l'IP de sortie de Squid.
resource "scaleway_lb_ip" "ingress" {
  project_id = var.project_id
  zone       = var.zone
  tags       = local.tags
}

resource "scaleway_ipam_ip" "load_balancer" {
  project_id = var.project_id
  is_ipv6    = false

  source {
    private_network_id = var.private_network_id
  }
}

resource "scaleway_lb" "proxy" {
  name        = "${local.name}-lb"
  description = "Entrée TLS du proxy partenaires ${var.workspace}"
  project_id  = var.project_id
  zone        = var.zone
  type        = var.load_balancer_type
  ip_ids      = [scaleway_lb_ip.ingress.id]
  tags        = local.tags

  private_network {
    private_network_id = var.private_network_id
    ipam_ids           = [scaleway_ipam_ip.load_balancer.id]
  }
}

resource "scaleway_lb_backend" "squid" {
  name                   = "${local.name}-squid"
  lb_id                  = scaleway_lb.proxy.id
  forward_protocol       = "tcp"
  forward_port           = 3128
  forward_port_algorithm = "roundrobin"
  proxy_protocol         = "none"
  ssl_bridging           = false
  server_ips = [
    for ip in scaleway_instance_private_nic.proxy.private_ips : ip.address
    if can(cidrnetmask("${ip.address}/32"))
  ]

  health_check_port        = 3128
  health_check_delay       = "10s"
  health_check_timeout     = "5s"
  health_check_max_retries = 3
  health_check_tcp {}

  timeout_connect = "5s"
  timeout_server  = "15m"
  timeout_tunnel  = "15m"
}

# Le DNS doit pointer sur l'IP d'entrée avant de créer le certificat.
resource "scaleway_lb_certificate" "proxy" {
  name  = "${local.name}-tls"
  lb_id = scaleway_lb.proxy.id

  letsencrypt {
    common_name = var.hostname
  }
}

resource "scaleway_lb_frontend" "https" {
  name               = "${local.name}-https"
  lb_id              = scaleway_lb.proxy.id
  backend_id         = scaleway_lb_backend.squid.id
  inbound_port       = 443
  certificate_ids    = [scaleway_lb_certificate.proxy.id]
  timeout_client     = "15m"
  enable_http3       = false
  enable_access_logs = false
}

locals {
  name = "${var.workspace}-partner-proxy"
  tags = [var.workspace, "partner-proxy"]
}

resource "scaleway_instance_ip" "egress" {
  project_id = var.project_id
  zone       = var.zone
  type       = "routed_ipv4"

  # L'adresse communiquée aux partenaires doit survivre au remplacement du serveur.
  lifecycle {
    prevent_destroy = true
  }
}

resource "scaleway_instance_security_group" "proxy" {
  name                    = "${local.name}-sg"
  project_id              = var.project_id
  zone                    = var.zone
  stateful                = true
  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"
  tags                    = local.tags

  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = "22"
    ip_range = var.private_network_cidr
  }

  inbound_rule {
    action   = "accept"
    protocol = "TCP"
    port     = "3128"
    ip_range = "${scaleway_ipam_ip.load_balancer.address}/32"
  }
}

resource "scaleway_instance_server" "proxy" {
  name              = local.name
  project_id        = var.project_id
  zone              = var.zone
  type              = var.instance_type
  image             = "ubuntu_resolute"
  state             = "started"
  enable_dynamic_ip = false
  ip_id             = scaleway_instance_ip.egress.id
  security_group_id = scaleway_instance_security_group.proxy.id
  tags              = local.tags

  root_volume {
    size_in_gb = 20
  }

  user_data = {
    cloud-init = "#cloud-config\n${yamlencode({
      package_update = true
      packages       = ["squid", "ca-certificates", "curl"]
      ssh_pwauth     = false
      # bootcmd s'exécute à chaque boot, contrairement à runcmd : ne masquer
      # Squid qu'une seule fois, avant sa configuration initiale.
      bootcmd = [["cloud-init-per", "instance", "mask-squid", "systemctl", "mask", "squid.service"]]
      write_files = [
        { path = "/etc/squid/squid.conf", permissions = "0644", content = file("${path.module}/config/squid.conf") },
        { path = "/etc/squid/egress.conf", permissions = "0644", content = "acl proxy_self dst ${scaleway_instance_ip.egress.address}/32\ntcp_outgoing_address ${scaleway_instance_ip.egress.address}\n" },
        { path = "/etc/squid/passwords", permissions = "0600", content = var.htpasswd },
        # L'image Ubuntu Scaleway utilise ens2 pour l'interface publique.
        # Priorité 10, devant la route DHCP privée (50), sans retirer les routes du VPC.
        { path = "/etc/netplan/90-partner-proxy.yaml", permissions = "0600", content = "network:\n  version: 2\n  ethernets:\n    ens2:\n      dhcp4-overrides:\n        route-metric: 10\n" },
        { path = "/etc/sysctl.d/90-partner-proxy.conf", permissions = "0644", content = "net.ipv6.conf.all.disable_ipv6 = 1\nnet.ipv6.conf.default.disable_ipv6 = 1\n" }
      ]
      runcmd = [
        ["chown", "root:proxy", "/etc/squid/passwords"],
        ["chmod", "0640", "/etc/squid/passwords"],
        ["sysctl", "--system"],
        ["netplan", "apply"],
        ["squid", "-k", "parse"],
        ["systemctl", "unmask", "squid.service"],
        ["systemctl", "daemon-reload"],
        ["systemctl", "enable", "--now", "squid.service"],
        ["systemctl", "reload", "ssh"]
      ]
    })}"
  }
}

resource "scaleway_instance_private_nic" "proxy" {
  server_id          = scaleway_instance_server.proxy.id
  private_network_id = var.private_network_id
  zone               = var.zone
}

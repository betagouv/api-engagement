locals {
  api_port     = 8108
  peering_port = 8107
  node_keys    = sort(keys(var.nodes))
  node_zones   = toset(distinct([for node in var.nodes : node.zone]))
}


resource "scaleway_ipam_ip" "node" {
  for_each = var.nodes

  address = each.value.private_ip
  source {
    private_network_id = var.private_network_id
  }
}

resource "scaleway_instance_security_group" "typesense" {
  for_each = local.node_zones

  name                    = "${var.name_prefix}-${each.key}-sg"
  project_id              = var.project_id
  zone                    = each.key
  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"
  tags                    = ["typesense", var.workspace]

  inbound_rule {
    action   = "accept"
    port     = "22"
    ip_range = var.private_network_cidr
  }

  inbound_rule {
    action   = "accept"
    port     = tostring(local.api_port)
    ip_range = var.private_network_cidr
  }

  inbound_rule {
    action   = "accept"
    port     = tostring(local.peering_port)
    ip_range = var.private_network_cidr
  }
}

resource "scaleway_instance_server" "node" {
  for_each = var.nodes

  name              = "${var.name_prefix}-${each.key}"
  project_id        = var.project_id
  zone              = each.value.zone
  type              = each.value.instance_type
  image             = "ubuntu_resolute"
  state             = "started"
  enable_dynamic_ip = false
  security_group_id = scaleway_instance_security_group.typesense[each.value.zone].id
  tags              = ["typesense", var.workspace, each.key]

  user_data = {
    cloud-init = templatefile("${path.module}/templates/cloud-init.yaml.tftpl", {
      api_port               = local.api_port
      node_private_ip        = each.value.private_ip
      peering_port           = local.peering_port
      typesense_api_key_b64  = base64encode(var.typesense_api_key)
      typesense_nodes        = join(",", [for key in local.node_keys : "${var.nodes[key].private_ip}:${local.peering_port}:${local.api_port}"])
      typesense_version      = each.value.typesense_version
      typesense_docker_image = "typesense/typesense"
      typesense_container    = "typesense"
    })
  }
}

resource "scaleway_instance_private_nic" "node" {
  for_each = var.nodes

  server_id          = scaleway_instance_server.node[each.key].id
  private_network_id = var.private_network_id
  ipam_ip_ids        = [scaleway_ipam_ip.node[each.key].id]
  zone               = each.value.zone
}

resource "scaleway_ipam_ip" "load_balancer" {
  address = var.load_balancer_private_ip

  source {
    private_network_id = var.private_network_id
  }
}

resource "scaleway_lb" "typesense" {
  name               = "${var.name_prefix}-lb"
  description        = "Private Typesense load balancer for ${var.workspace}"
  project_id         = var.project_id
  zone               = var.load_balancer_zone
  type               = var.load_balancer_type
  assign_flexible_ip = false
  tags               = ["typesense", var.workspace]

  private_network {
    private_network_id = var.private_network_id
    ipam_ids           = [scaleway_ipam_ip.load_balancer.id]
  }
}

resource "scaleway_lb_backend" "typesense" {
  name                     = "${var.name_prefix}-backend"
  lb_id                    = scaleway_lb.typesense.id
  forward_protocol         = "tcp"
  forward_port             = local.api_port
  forward_port_algorithm   = "roundrobin"
  proxy_protocol           = "none"
  server_ips               = [for key in local.node_keys : var.nodes[key].private_ip]
  health_check_port        = local.api_port
  health_check_delay       = "10s"
  health_check_timeout     = "5s"
  health_check_max_retries = 3

  depends_on = [scaleway_instance_private_nic.node]
}

resource "scaleway_lb_frontend" "typesense" {
  name           = "${var.name_prefix}-frontend"
  lb_id          = scaleway_lb.typesense.id
  backend_id     = scaleway_lb_backend.typesense.id
  inbound_port   = local.api_port
  timeout_client = "30s"
}

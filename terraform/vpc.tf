resource "scaleway_vpc" "main" {
  name = "${var.workspace}-vpc"
  tags = ["${var.workspace}"]
}

resource "scaleway_vpc_private_network" "main" {
  name   = "${var.workspace}-private-network"
  vpc_id = scaleway_vpc.main.id
  tags   = ["${var.workspace}"]

  ipv4_subnet {
    subnet = var.private_network_cidr
  }
}

resource "scaleway_vpc_public_gateway_ip" "main" {
  count      = var.enable_public_gateway ? 1 : 0
  project_id = var.project_id
  zone       = var.public_gateway_zone
  tags       = ["${var.workspace}"]
}

resource "scaleway_vpc_public_gateway" "main" {
  count           = var.enable_public_gateway ? 1 : 0
  name            = "${var.workspace}-gateway"
  project_id      = var.project_id
  zone            = var.public_gateway_zone
  type            = var.public_gateway_type
  ip_id           = scaleway_vpc_public_gateway_ip.main[0].id
  bastion_enabled = true
  bastion_port    = var.public_gateway_bastion_port
  tags            = ["${var.workspace}"]
}

resource "scaleway_vpc_gateway_network" "main" {
  count              = var.enable_public_gateway ? 1 : 0
  zone               = var.public_gateway_zone
  gateway_id         = scaleway_vpc_public_gateway.main[0].id
  private_network_id = scaleway_vpc_private_network.main.id
  enable_masquerade  = true

  ipam_config {
    push_default_route = true
  }
}

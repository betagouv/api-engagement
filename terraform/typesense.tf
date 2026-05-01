module "typesense" {
  count  = var.enable_typesense ? 1 : 0
  source = "./modules/typesense"

  project_id               = var.project_id
  workspace                = var.workspace
  name_prefix              = "${var.workspace}-typesense"
  region                   = "fr-par"
  nodes                    = var.typesense_nodes
  private_network_cidr     = var.private_network_cidr
  private_network_id       = scaleway_vpc_private_network.main.id
  load_balancer_private_ip = var.typesense_load_balancer_private_ip
  load_balancer_type       = var.typesense_load_balancer_type
  load_balancer_zone       = var.public_gateway_zone
  typesense_api_key        = lookup(local.secrets, "TYPESENSE_API_KEY", "")
}

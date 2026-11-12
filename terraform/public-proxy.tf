module "public_proxy" {
  count  = var.enable_public_proxy ? 1 : 0
  source = "./modules/public-proxy"

  project_id           = var.project_id
  workspace            = var.workspace
  private_network_id   = scaleway_vpc_private_network.main.id
  private_network_cidr = var.private_network_cidr
  zone                 = var.public_proxy_zone
  instance_type        = var.public_proxy_instance_type
  hostname             = var.public_proxy_hostname != "" ? var.public_proxy_hostname : "proxy.${trimprefix(var.api_hostname, "api.")}"
  load_balancer_type   = var.public_proxy_load_balancer_type
  htpasswd             = lookup(local.secrets, "PUBLIC_PROXY_HTPASSWD", "")
}

output "public_proxy" {
  description = "Adresses d'entrée HTTPS et de sortie du proxy public, ou null si désactivé."
  value = var.enable_public_proxy ? {
    instance_id                = module.public_proxy[0].instance_id
    public_ipv4                = module.public_proxy[0].public_ipv4
    private_ips                = module.public_proxy[0].private_ips
    load_balancer_public_ipv4  = module.public_proxy[0].load_balancer_public_ipv4
    load_balancer_private_ipv4 = module.public_proxy[0].load_balancer_private_ipv4
    url                        = module.public_proxy[0].url
  } : null
}

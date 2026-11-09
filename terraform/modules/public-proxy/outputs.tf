output "instance_id" {
  description = "Identifiant zoné de l'Instance."
  value       = scaleway_instance_server.proxy.id
}

output "public_ipv4" {
  description = "IPv4 réservée destinée à être autorisée par les partenaires après validation du routage."
  value       = scaleway_instance_ip.egress.address
}

output "private_ips" {
  description = "Adresses privées de l'interface du proxy."
  value       = scaleway_instance_private_nic.proxy.private_ips
}

output "load_balancer_public_ipv4" {
  description = "IPv4 d'entrée : le DNS du proxy doit pointer sur cette adresse."
  value       = scaleway_lb_ip.ingress.ip_address
}

output "load_balancer_private_ipv4" {
  description = "IPv4 du Load Balancer sur le réseau privé, autorisée à joindre Squid."
  value       = scaleway_ipam_ip.load_balancer.address
}

output "url" {
  description = "URL du proxy HTTPS pour les clients, dont les Serverless Jobs."
  value       = "https://${var.hostname}:443"
}

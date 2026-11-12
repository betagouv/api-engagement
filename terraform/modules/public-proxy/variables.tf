variable "project_id" {
  type        = string
  description = "Projet Scaleway hébergeant l'Instance."
}

variable "workspace" {
  type        = string
  description = "Environnement utilisé pour les noms et tags."
}

variable "private_network_id" {
  type        = string
  description = "Réseau privé de l'API et du worker."
}

variable "private_network_cidr" {
  type        = string
  description = "Plage privée autorisée à accéder à SSH."
}

variable "zone" {
  type        = string
  description = "Zone de l'Instance et de son IPv4 réservée."
}

variable "instance_type" {
  type        = string
  description = "Type d'Instance du proxy."
}

variable "hostname" {
  type        = string
  description = "Domaine public du proxy, utilisé pour le certificat Let's Encrypt du Load Balancer."
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.hostname))
    error_message = "Fournir un nom DNS public valide, sans protocole ni chemin."
  }
}

variable "load_balancer_type" {
  type        = string
  default     = "LB-S"
  description = "Type de Load Balancer Scaleway."
}

variable "htpasswd" {
  type        = string
  sensitive   = true
  description = "Contenu htpasswd bcrypt (un compte par ligne), issu de PUBLIC_PROXY_HTPASSWD."
  validation {
    condition = length(trimspace(var.htpasswd)) > 0 && alltrue([
      for line in split("\n", trimspace(var.htpasswd)) :
      can(regex("^[a-zA-Z0-9_-]+:\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$", line))
    ])
    error_message = "PUBLIC_PROXY_HTPASSWD doit contenir des comptes avec empreintes bcrypt, un par ligne."
  }
}

variable "project_id" {
  type        = string
  description = "Scaleway Project ID."
}

variable "workspace" {
  type        = string
  description = "Deployment workspace name."
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for Typesense resources."
}

variable "region" {
  type        = string
  default     = "fr-par"
  description = "Scaleway region."
}

variable "nodes" {
  type = map(object({
    zone              = string
    private_ip        = string
    instance_type     = string
    typesense_version = string
  }))
  description = "Typesense nodes keyed by stable node name, with one private IP per node."

  validation {
    condition     = length(var.nodes) == 1 || (length(var.nodes) >= 3 && length(var.nodes) % 2 == 1)
    error_message = "Typesense requires either 1 node or an odd number of at least 3 nodes."
  }
}


variable "private_network_cidr" {
  type        = string
  description = "CIDR block used by the Typesense Private Network."
}

variable "private_network_id" {
  type        = string
  description = "Scaleway Private Network ID used by Typesense nodes."
}

variable "load_balancer_private_ip" {
  type        = string
  description = "Private IP used by the Typesense load balancer."

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", var.load_balancer_private_ip))
    error_message = "load_balancer_private_ip must be an IPv4 address without CIDR suffix, for example 10.43.2.10."
  }
}

variable "load_balancer_type" {
  type        = string
  default     = "LB-S"
  description = "Scaleway Load Balancer type used by Typesense."
}

variable "load_balancer_zone" {
  type        = string
  default     = "fr-par-1"
  description = "Zone used by the Typesense load balancer."
}

variable "typesense_api_key" {
  type        = string
  sensitive   = true
  description = "Typesense admin API key."

  validation {
    condition     = length(var.typesense_api_key) > 0
    error_message = "typesense_api_key must not be empty when the Typesense module is enabled."
  }
}

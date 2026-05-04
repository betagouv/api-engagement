variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Tag of the Docker image to deploy."
}

variable "project_id" {
  type        = string
  description = "Scaleway Project ID"
}

variable "github_repository" {
  type        = string
  default     = "betagouv/api-engagement"
  description = "GitHub repository name in format org/repo"
}

# Environment

variable "workspace" {
  type        = string
  description = "Workspace name (production, staging, sandbox)"
}

variable "env" {
  type        = string
  description = "Environment name (production, staging)"
}

# Hostnames

variable "api_hostname" {
  type = string
}

variable "app_hostname" {
  type = string
}

variable "benevolat_hostname" {
  type    = string
  default = ""
}

variable "volontariat_hostname" {
  type    = string
  default = ""
}

variable "piloty_hostname" {
  type    = string
  default = ""
}

# Misc

variable "bucket_name" {
  type = string
}

variable "slack_jobteaser_channel_id" {
  type    = string
  default = ""
}

# Container sizing

variable "api_cpu_limit" {
  type = number
}

variable "api_memory_limit" {
  type = number
}

variable "api_min_scale" {
  type = number
}

variable "api_max_scale" {
  type = number
}

variable "app_cpu_limit" {
  type    = number
  default = 250
}

variable "app_memory_limit" {
  type    = number
  default = 512
}

variable "app_min_scale" {
  type    = number
  default = 0
}

variable "app_max_scale" {
  type    = number
  default = 1
}

variable "widget_cpu_limit" {
  type    = number
  default = 250
}

variable "widget_memory_limit" {
  type    = number
  default = 512
}

variable "widget_min_scale" {
  type    = number
  default = 0
}

variable "widget_max_scale" {
  type    = number
  default = 1
}

variable "worker_cpu_limit" {
  type    = number
  default = 250
}

variable "worker_memory_limit" {
  type    = number
  default = 512
}

variable "worker_min_scale" {
  type    = number
  default = 0
}

variable "worker_max_scale" {
  type    = number
  default = 1
}

# Feature flags

variable "enable_widget" {
  type    = bool
  default = true
}

variable "enable_async_tasks" {
  type    = bool
  default = true
}

variable "enable_intern_jobs" {
  type        = bool
  default     = true
  description = "Enable partner integration jobs (talent, grimpio, linkedin, etc.)"
}

variable "enable_analytics_jobs" {
  type    = bool
  default = true
}

variable "enable_mission_jobs" {
  type        = bool
  default     = true
  description = "Enable always-on mission jobs (import-missions, enrich-missions-geoloc, verify-publisher-organization)"
}

variable "enable_rdb_backup_job" {
  type        = bool
  default     = false
  description = "Enable the daily Scaleway managed PostgreSQL backup job"
}

variable "core_database_id" {
  type        = string
  default     = ""
  description = "ID of the managed PostgreSQL instance to back up"
}

variable "cockpit_metrics_otlp_url" {
  type    = string
  default = ""
}

variable "enable_app" {
  type        = bool
  default     = true
  description = "Enable the app container"
}

variable "enable_poc_quiz" {
  type        = bool
  default     = false
  description = "Enable the poc-quiz container"
}

variable "poc_quiz_hostname" {
  type    = string
  default = ""
}

variable "enable_plateform" {
  type        = bool
  default     = false
  description = "Enable the plateform container"
}

variable "plateform_hostname" {
  type    = string
  default = ""
}

variable "plateform_cpu_limit" {
  type    = number
  default = 250
}

variable "plateform_memory_limit" {
  type    = number
  default = 512
}

variable "plateform_min_scale" {
  type    = number
  default = 0
}

variable "plateform_max_scale" {
  type    = number
  default = 1
}

# Network

variable "private_network_cidr" {
  type        = string
  description = "CIDR block used by the workspace Private Network."
}

variable "enable_public_gateway" {
  type        = bool
  default     = false
  description = "Enable a Public Gateway with SSH bastion for this workspace."
}

variable "public_gateway_zone" {
  type        = string
  default     = "fr-par-1"
  description = "Zone used by the Public Gateway."
}

variable "public_gateway_type" {
  type        = string
  default     = "VPC-GW-S"
  description = "The type of the Public Gateway"
}

variable "public_gateway_bastion_port" {
  type        = number
  default     = 61000
  description = "SSH bastion port exposed by the Public Gateway."
}

# Typesense

variable "enable_typesense" {
  type        = bool
  default     = false
  description = "Enable the self-hosted Typesense HA cluster."
}

variable "typesense_nodes" {
  type = map(object({
    zone              = string
    private_ip        = string
    instance_type     = string
    typesense_version = string
  }))
  description = "Typesense nodes keyed by stable node name, with one private IP per node."
}

variable "typesense_load_balancer_private_ip" {
  type        = string
  default     = ""
  description = "Private IP used by the Typesense load balancer."

  validation {
    condition     = var.typesense_load_balancer_private_ip == "" || can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", var.typesense_load_balancer_private_ip))
    error_message = "typesense_load_balancer_private_ip must be empty or an IPv4 address without CIDR suffix, for example 10.43.2.10."
  }
}

variable "typesense_load_balancer_type" {
  type        = string
  default     = "LB-S"
  description = "Scaleway Load Balancer type used by Typesense."
}

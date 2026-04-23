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

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Tag of the Docker image to deploy. Use 'latest' for the default environment tag, or a specific value like 'sha' for a specific commit."
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

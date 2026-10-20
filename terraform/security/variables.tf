variable "security_project_id" {
  type        = string
  description = "ID du projet Scaleway security dans l'organisation existante."
}

variable "backup_bucket_name" {
  type        = string
  description = "Nom globalement unique du bucket des sauvegardes RDB."
}

variable "region" {
  type        = string
  description = "Région Scaleway du bucket."
  default     = "fr-par"
}

variable "zone" {
  type        = string
  description = "Zone Scaleway utilisée par le provider."
  default     = "fr-par-1"
}

variable "immutable_retention_days" {
  type        = number
  description = "Durée pendant laquelle chaque objet est protégé contre la suppression et le remplacement."
  default     = 30

  validation {
    condition     = var.immutable_retention_days > 0
    error_message = "La durée de rétention immuable doit être supérieure à zéro."
  }
}

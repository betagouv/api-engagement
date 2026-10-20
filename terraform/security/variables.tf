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

variable "backup_lifecycle_expiration_days" {
  type        = number
  description = "Nombre de jours avant expiration automatique des backups RDB"
  default     = 60

  validation {
    condition     = var.backup_lifecycle_expiration_days > var.immutable_retention_days && floor(var.backup_lifecycle_expiration_days) == var.backup_lifecycle_expiration_days
    error_message = "La durée d'expiration doit être un nombre entier de jours supérieur à la rétention Object Lock."
  }
}

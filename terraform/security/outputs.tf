output "backup_bucket_name" {
  description = "Nom du bucket de sauvegardes RDB."
  value       = scaleway_object_bucket.rdb_backups.name
}

output "backup_bucket_endpoint" {
  description = "Endpoint S3 régional du bucket de sauvegardes."
  value       = scaleway_object_bucket.rdb_backups.endpoint
}

output "security_project_id" {
  description = "Projet Scaleway security contenant les ressources."
  value       = var.project_id
}

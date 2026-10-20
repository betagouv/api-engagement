resource "scaleway_object_bucket" "rdb_backups" {
  name                = var.backup_bucket_name
  project_id          = var.security_project_id
  region              = var.region
  object_lock_enabled = true
  force_destroy       = false

  versioning {
    enabled = true
  }

  tags = {
    purpose = "rdb-backups"
    managed = "terraform"
    project = "security"
  }
}

resource "scaleway_object_bucket_lock_configuration" "rdb_backups" {
  bucket     = scaleway_object_bucket.rdb_backups.name
  project_id = var.security_project_id
  region     = var.region

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = var.immutable_retention_days
    }
  }
}

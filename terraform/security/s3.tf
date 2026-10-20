resource "scaleway_object_bucket" "rdb_backups" {
  name                = var.backup_bucket_name
  project_id          = var.security_project_id
  region              = var.region
  object_lock_enabled = true
  force_destroy       = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-rdb-backups"
    enabled = true

    transition {
      days          = 30
      storage_class = "ONEZONE_IA"
    }

    expiration {
      days = var.backup_lifecycle_expiration_days
    }

    # Expiration only hides the current version in a versioned bucket.
    # Remove that previous version after it has become noncurrent.
    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }

  lifecycle_rule {
    id      = "remove-expired-rdb-delete-markers"
    enabled = true

    expiration {
      expired_object_delete_marker = true
    }
  }

  lifecycle_rule {
    id                                     = "abort-incomplete-multipart-uploads"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 7
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

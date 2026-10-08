# Une clé dédiée aux jobs par workspace disposant d'une Public Gateway.
# La clé privée est sensible, mais reste stockée dans le state Terraform.
resource "tls_private_key" "ssh_jobs" {
  count     = var.enable_public_gateway ? 1 : 0
  algorithm = "ED25519"
}

resource "scaleway_iam_ssh_key" "ssh_jobs" {
  count      = var.enable_public_gateway ? 1 : 0
  name       = "${var.workspace}-jobs-ssh"
  project_id = var.project_id
  public_key = tls_private_key.ssh_jobs[0].public_key_openssh
}

locals {
  ssh_tunnel_env_vars = {
    "SSH_TUNNEL_URL_ENV"      = "DATABASE_URL_CORE"
    "SSH_TUNNEL_ENABLED"      = lookup(local.secrets, "SSH_TUNNEL_ENABLED", "false")
    "SSH_TUNNEL_BASTION_HOST" = var.enable_public_gateway ? scaleway_vpc_public_gateway_ip.main[0].address : ""
    "SSH_TUNNEL_BASTION_PORT" = var.enable_public_gateway ? tostring(scaleway_vpc_public_gateway.main[0].bastion_port) : "61000"
    "SSH_TUNNEL_LOCAL_PORT"   = lookup(local.secrets, "SSH_TUNNEL_LOCAL_PORT", "15432")
    "SSH_TUNNEL_PRIVATE_KEY"  = var.enable_public_gateway ? tls_private_key.ssh_jobs[0].private_key_openssh : ""
    "SSH_TUNNEL_KNOWN_HOSTS"  = lookup(local.secrets, "SSH_TUNNEL_KNOWN_HOSTS", "")
  }
}

# Conserver les clés existantes lors du renommage des ressources.
moved {
  from = tls_private_key.core_db_jobs
  to   = tls_private_key.ssh_jobs
}

moved {
  from = scaleway_iam_ssh_key.core_db_jobs
  to   = scaleway_iam_ssh_key.ssh_jobs
}

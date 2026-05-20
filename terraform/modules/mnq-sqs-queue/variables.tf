variable "project_id" {
  type = string
}

variable "name" {
  type = string
}

variable "access_key" {
  type = string
}

variable "secret_key" {
  type      = string
  sensitive = true
}

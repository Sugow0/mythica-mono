variable "postgres_user" {
  description = "Utilisateur PostgreSQL"
  type        = string
  default     = "admin"
}

variable "postgres_password" {
  description = "Mot de passe PostgreSQL (secret — fourni via tfvars ou TF_VAR_)"
  type        = string
  sensitive   = true
}

variable "postgres_db" {
  description = "Nom de la base"
  type        = string
  default     = "mythica_db"
}

variable "postgres_port" {
  description = "Port hôte exposé pour PostgreSQL"
  type        = number
  default     = 22000
}

variable "redis_port" {
  description = "Port hôte exposé pour Redis"
  type        = number
  default     = 23000
}

variable "postgres_image" {
  description = "Image Docker PostgreSQL"
  type        = string
  default     = "postgres:16-alpine"
}

variable "redis_image" {
  description = "Image Docker Redis"
  type        = string
  default     = "redis:7-alpine"
}

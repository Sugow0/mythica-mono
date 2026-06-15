output "postgres_endpoint" {
  description = "Endpoint de connexion PostgreSQL"
  value       = "localhost:${var.postgres_port}"
}

output "redis_endpoint" {
  description = "Endpoint de connexion Redis"
  value       = "localhost:${var.redis_port}"
}

output "database_url" {
  description = "URL de connexion prête à l'emploi pour les services"
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@localhost:${var.postgres_port}/${var.postgres_db}"
  sensitive   = true
}

output "network_name" {
  description = "Réseau Docker créé"
  value       = docker_network.mythica.name
}

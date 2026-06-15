# Provisionne l'infrastructure de données locale (Postgres + Redis) via le
# provider Docker. Sans cloud à disposition, le provider Docker permet de
# démontrer la maîtrise de Terraform (ressources, variables, outputs, state)
# de façon reproductible et gratuite. Le passage à un provider cloud (AWS RDS,
# ElastiCache…) ne changerait que les blocs `resource`, pas la structure.

resource "docker_network" "mythica" {
  name = "mythica-net"
}

resource "docker_image" "postgres" {
  name = var.postgres_image
}

resource "docker_image" "redis" {
  name = var.redis_image
}

resource "docker_volume" "postgres_data" {
  name = "mythica-postgres-data"
}

resource "docker_container" "postgres" {
  name  = "mythica-postgres"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "POSTGRES_DB=${var.postgres_db}",
  ]

  ports {
    internal = 5432
    external = var.postgres_port
  }

  networks_advanced {
    name = docker_network.mythica.name
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U ${var.postgres_user}"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }

  restart = "unless-stopped"
}

resource "docker_container" "redis" {
  name  = "mythica-redis"
  image = docker_image.redis.image_id

  ports {
    internal = 6379
    external = var.redis_port
  }

  networks_advanced {
    name = docker_network.mythica.name
  }

  healthcheck {
    test     = ["CMD", "redis-cli", "ping"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }

  restart = "unless-stopped"
}

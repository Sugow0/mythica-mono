# Terraform — Infrastructure de données

Provisionne **Postgres + Redis** via le provider [Docker](https://registry.terraform.io/providers/kreuzwerker/docker/latest)
(local, gratuit, reproductible). Démontre Terraform sans cloud payant.

## Usage

```bash
cd iac/terraform
cp terraform.tfvars.example terraform.tfvars   # renseigner le mot de passe
terraform init
terraform plan
terraform apply
terraform output            # endpoints
terraform destroy           # tout supprimer
```

## Contenu

| Fichier | Rôle |
|---------|------|
| `versions.tf` | Version Terraform + provider Docker épinglé |
| `variables.tf` | Variables (user/password/ports/images) |
| `main.tf` | Réseau, volumes, conteneurs Postgres + Redis avec healthcheck |
| `outputs.tf` | Endpoints + `database_url` (sensible) |

## State

Le state est ici **local** (`terraform.tfstate`, gitignoré). En équipe/production,
on utiliserait un **backend remote** (S3 + DynamoDB lock, ou Terraform Cloud)
pour partager le state et éviter les conflits :

```hcl
terraform {
  backend "s3" {
    bucket         = "mythica-tfstate"
    key            = "data/terraform.tfstate"
    region         = "eu-west-3"
    dynamodb_table = "mythica-tflock"
  }
}
```

## Passage au cloud

Pour une vraie infra, on remplacerait les `docker_container` par des ressources
managées (`aws_db_instance` pour RDS Postgres, `aws_elasticache_cluster` pour
Redis), un `aws_vpc`/`aws_subnet` pour le réseau, et un `aws_lb` pour le load
balancer. La structure (variables, outputs, modules) resterait identique.
Coût estimé d'un environnement minimal AWS : ~30-50 €/mois (db.t4g.micro +
cache.t4g.micro + ALB).

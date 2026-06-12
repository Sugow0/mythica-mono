# Mythica — Monorepo

Monorepo des services et applications Mythica, géré avec [Bun workspaces](https://bun.sh/docs/install/workspaces) et [Changesets](https://github.com/changesets/changesets).

## État des CI

| Service | Statut |
|---------|--------|
| API | [![mythica-api CI](https://github.com/tengram-labs/mythica-mono/actions/workflows/api.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/api.yml) |
| Gameplay | [![mythica-gameplay CI](https://github.com/tengram-labs/mythica-mono/actions/workflows/gameplay.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/gameplay.yml) |
| Gateway | [![mythica-gateway CI](https://github.com/tengram-labs/mythica-mono/actions/workflows/gateway.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/gateway.yml) |
| Front | [![mythica-front CI](https://github.com/tengram-labs/mythica-mono/actions/workflows/front.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/front.yml) |
| Mobile | [![mythica-mobile CI](https://github.com/tengram-labs/mythica-mono/actions/workflows/mobile.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/mobile.yml) |
| Sécurité | [![security](https://github.com/tengram-labs/mythica-mono/actions/workflows/security.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/security.yml) |
| IaC | [![iac](https://github.com/tengram-labs/mythica-mono/actions/workflows/iac.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/iac.yml) |
| SonarCloud | [![sonarcloud](https://github.com/tengram-labs/mythica-mono/actions/workflows/sonarcloud.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/sonarcloud.yml) |
| Release | [![release](https://github.com/tengram-labs/mythica-mono/actions/workflows/release.yml/badge.svg)](https://github.com/tengram-labs/mythica-mono/actions/workflows/release.yml) |

## Documentation

- [Architecture & pipeline CI/CD](docs/architecture.md) — schémas, déploiement, **rollback**
- [Design Patterns](docs/patterns.md) — patterns utilisés, justifiés
- [Monitoring & observabilité](monitoring/README.md) — Prometheus / Grafana / alerting
- [Infrastructure as Code](iac/) — [Terraform](iac/terraform/README.md) · [Ansible](iac/ansible/README.md)

## Structure

```
apps/
├── mythica-api         API plateforme (Elysia · Bun · Prisma · Lucia)
├── mythica-gameplay    Service gameplay (Elysia · Bun · Prisma)
├── mythica-gateway     Gateway / reverse-proxy applicatif (Elysia · Bun)
├── mythica-front       Front web (SvelteKit · Vite · Tailwind)
├── mythica-mobile      Application mobile (Expo · React Native)
└── mythica-ai-service  Service IA (Python)
packages/               Code partagé entre les apps
```

## Prérequis

- [Bun](https://bun.sh) (dernière version stable)
- Docker (pour `docker-compose` et les builds d'images)

## Démarrage

```bash
# Installer toutes les dépendances du workspace
bun install

# Lancer tous les services en développement
bun run dev

# Ou un service ciblé
bun run dev:api
bun run dev:front
bun run dev:gateway
bun run dev:gameplay

# Services d'infrastructure (Postgres, Redis, etc.)
docker compose up -d

# Stack de monitoring (Prometheus + Grafana)
docker compose -f monitoring/docker-compose.yml up -d
```

Chaque service fournit un `.env.example` (variables attendues, sans valeurs). En
dev, les vraies valeurs vivent dans `apps/*/config/<env>.env`, chiffrées via
[dotenvx](https://dotenvx.com) — aucun secret en clair n'est committé.

## Qualité

### Lint

Le lint est géré par [Biome](https://biomejs.dev) (services backend) et ESLint/Prettier (front).

```bash
bun run lint        # lint + auto-fix sur tout le workspace
bun run lint:ci     # vérification sans modification (utilisé en CI)
```

### Tests & couverture

Les tests tournent dans la CI de chaque service qui en possède (`api`, `front`). Le **rapport de couverture est publié dans le résumé de chaque exécution CI** (onglet *Summary*) et **archivé en artefact**. Le seuil de **70 % est bloquant** côté `api` (cf. [`bunfig.toml`](apps/mythica-api/bunfig.toml)).

```bash
bun run --cwd apps/mythica-api test          # tests API (bun test)
bun run --cwd apps/mythica-api test:coverage # avec couverture
bun run --cwd apps/mythica-front test        # tests front (vitest)
```

### Sécurité — Trivy

Chaque pipeline lance un scan [Trivy](https://aquasecurity.github.io/trivy/) :

- **Images Docker** scannées pour `api`, `gameplay` et `gateway` ;
- **Système de fichiers** scanné pour `front` et `mobile`.

Le rapport des vulnérabilités HIGH/CRITICAL est publié dans le résumé de CI, et **le job échoue dès qu'une vulnérabilité CRITICAL corrigeable est détectée**. La configuration partagée se trouve dans [`.github/actions/trivy`](.github/actions/trivy/action.yml).

### Sécurité — secrets & workflows

Le workflow [`security.yml`](.github/workflows/security.yml) (push, PR, et hebdomadaire) exécute :

- **[gitleaks](https://github.com/gitleaks/gitleaks)** — détection de secrets commités (les `.env` chiffrés par dotenvx sont exclus via [`.gitleaks.toml`](.gitleaks.toml)) ;
- **[actionlint](https://github.com/rhysd/actionlint)** + **shellcheck** — lint des workflows GitHub Actions et de leurs scripts.

### Robustesse des pipelines

- **Cache du store Bun** mutualisé via l'action composite [`.github/actions/bun-install`](.github/actions/bun-install/action.yml) ;
- **Concurrency** : les runs obsolètes d'une même branche sont annulés automatiquement ;
- **Actions épinglées en SHA** (commit complet) — mises à jour automatiquement par [Dependabot](.github/dependabot.yml) (npm, github-actions, docker) ;
- **Artifacts** : rapports de couverture et de scan Trivy/gitleaks archivés sur chaque run.

### Qualité de code (hooks & SonarCloud)

- **Pre-commit** ([lefthook](https://github.com/evilmartians/lefthook)) : Biome + Prettier sur les fichiers stagés, et validation du message de commit (Conventional Commits) — installés via `bun install`.
- **SonarCloud** ([`sonarcloud.yml`](.github/workflows/sonarcloud.yml)) : analyse statique + quality gate. Activé si le secret `SONAR_TOKEN` est présent (gratuit pour les repos publics — voir la note pour les repos privés).

## Versioning & déploiement

- Les changements de version sont gérés via [Changesets](https://github.com/changesets/changesets) (`bunx changeset`).
- **CD** : push sur `staging`/`main` → déploiement Dokploy (environnements GitHub `staging` / `production` avec approbation manuelle en prod). Le workflow [`release.yml`](.github/workflows/release.yml) publie les images sur **ghcr.io** (tags `v*` ou déclenchement manuel).
- Les migrations Prisma sont générées et appliquées dans les pipelines `api` et `gameplay`.
- **Rollback** : redéploiement d'un tag d'image précédent — procédure détaillée dans [docs/architecture.md](docs/architecture.md#stratégie-de-rollback).

## Monitoring

`/health` (état + dépendances) sur chaque service, `/metrics` Prometheus sur le gateway, dashboards Grafana et 3 alertes. Voir [monitoring/README.md](monitoring/README.md).

## Infrastructure as Code

[Terraform](iac/terraform/) (provider Docker : Postgres + Redis) et [Ansible](iac/ansible/) (reverse proxy nginx), validés en CI par [`iac.yml`](.github/workflows/iac.yml).

## Conventions de commit

Le projet suit les [Conventional Commits](https://www.conventionalcommits.org/). Voir [`CLAUDE.md`](CLAUDE.md) pour les règles détaillées.

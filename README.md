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
```

## Qualité

### Lint

Le lint est géré par [Biome](https://biomejs.dev) (services backend) et ESLint/Prettier (front).

```bash
bun run lint        # lint + auto-fix sur tout le workspace
bun run lint:ci     # vérification sans modification (utilisé en CI)
```

### Tests & couverture

Les tests tournent dans la CI de chaque service qui en possède (`api`, `front`). Le **rapport de couverture est publié dans le résumé de chaque exécution CI** (onglet *Summary* du run GitHub Actions).

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

## Versioning & déploiement

- Les changements de version sont gérés via [Changesets](https://github.com/changesets/changesets) (`bunx changeset`).
- Les déploiements (staging / production) sont déclenchés automatiquement sur push vers `staging` / `main` via Dokploy.
- Les migrations Prisma sont générées et appliquées dans les pipelines `api` et `gameplay`.

## Conventions de commit

Le projet suit les [Conventional Commits](https://www.conventionalcommits.org/). Voir [`CLAUDE.md`](CLAUDE.md) pour les règles détaillées.

# Mythica — Guide des agents

Ce fichier **fait autorité** pour tout agent travaillant sur ce dépôt. Il prime sur
les comportements par défaut. Lis-le entièrement avant d'écrire la moindre ligne.

> Référence complète de la stack, des CI et du déploiement : [`README.md`](README.md),
> [`docs/architecture.md`](docs/architecture.md), [`docs/patterns.md`](docs/patterns.md).

---

## 1. Stack & topologie

Monorepo **Bun workspaces** + **Changesets**. Services :

| App | Rôle | Stack |
|-----|------|-------|
| `apps/mythica-api` | API plateforme (identité, campagnes) | Elysia · Bun · Prisma 7 · Lucia · TypeBox |
| `apps/mythica-gameplay` | Service gameplay (fiches, règles) | Elysia · Bun · Prisma 7 · TypeBox |
| `apps/mythica-gateway` | Reverse-proxy applicatif | Elysia · Bun · Redis |
| `apps/mythica-front` | Front web | SvelteKit · Vite · Tailwind · shadcn-svelte · Paraglide |
| `apps/mythica-mobile` | App mobile | Expo · React Native |
| `apps/mythica-ai-service` | Service IA | Python |
| `packages/character-engine` | Moteur de calcul fiches (partagé) | TypeScript pur |

Infra dev via `docker compose up -d` : Postgres `:22000`, Redis `:23000`,
RustFS/S3 `:24000`, RabbitMQ `:25000`.

---

## 2. Outils CLI obligatoires

- **TOUJOURS** utiliser `rtk` pour les opérations git, find, grep, read, test, lint.
- **NE JAMAIS** utiliser `find`, `grep`, `cat` natifs en Bash — toujours préfixer avec `rtk`.
- Pour la lecture/recherche de fichiers, préférer `rtk read` / `rtk grep` / `rtk find` plutôt que les outils Read/Grep/Glob natifs quand c'est pertinent.

---

## 3. Règles d'or (non négociables)

- **Gestionnaire de paquets : Bun uniquement.** Jamais `npm`, `pnpm` ou `yarn`.
  Le seul lockfile valide est `bun.lock`. Si un `pnpm-lock.yaml` / `package-lock.json`
  apparaît, c'est une erreur : ne pas le committer, le supprimer.
- **Secrets : jamais en clair.** Les `.env` réels vivent dans `apps/*/config/<env>.env`,
  chiffrés via **dotenvx**. Ne jamais committer de secret ; chaque service a un `.env.example`.
- **Création de personnage / fiches : data-driven et multi-système.** Ne jamais coder
  en dur « race/classe » ou des règles D&D dans le front ou les endpoints. Tout passe
  par `collectionKey` / `kind` / flow servis comme données ; les calculs vivent dans
  `packages/character-engine`. Intégrité **hybride** : FK réelles pour les références,
  colonnes typées pour les scalaires, JSONB seulement pour le variable et **toujours
  validé** (TypeBox à l'écriture + CHECK Postgres).
- **Design : neutre, agnostique au genre de JDR.** Surfaces gris froid neutres,
  **crimson comme unique accent** (CTA, états actifs, badges, liens, logo) — jamais
  en décoration. Polices : Bricolage Grotesque (titres) + Public Sans (corps).
- **Vérification réelle en navigateur obligatoire** pour toute UI — `curl` ne suffit pas.
- **Commits** : Conventional Commits stricts, en français, **sans aucune mention de Claude**
  (cf. §7).

---

## 4. Skills obligatoires

L'usage des skills globaux est **imposé** — ne pas réimplémenter à la main ce qu'un
skill couvre. Invoque le skill correspondant dès que la situation se présente :

| Situation | Skill à invoquer | Quand |
|-----------|------------------|-------|
| Créer un message de commit | **`commit`** | Avant chaque commit |
| Travailler / concevoir de l'UI | **`frontend-design`** | Toute nouvelle UI ou refonte visuelle |
| Relire un diff (bugs, qualité) | **`code-review`** | Avant d'ouvrir/finaliser une PR |
| Nettoyer / simplifier du code | **`simplify`** | Après une implémentation |
| Valider un changement en conditions réelles | **`verify`** | Avant de pousser une feature |
| Lancer/voir l'app tourner | **`run`** | Pour la vérif navigateur |
| Recherche multi-sources documentée | **`deep-research`** | Question technique ouverte |

Règle : **si un skill couvre la tâche, l'invoquer avant toute action manuelle.** Ne pas
mentionner un skill sans réellement l'appeler.

---

## 5. Conventions par couche

### Backend (`api`, `gameplay`, `gateway`)
- **Biome** (lint + format) : indentation **tabulations**, guillemets **doubles**,
  imports organisés automatiquement. `bun run lint` (fix) / `bun run lint:ci` (CI).
- Validation des entrées/sorties via **TypeBox** (`@sinclair/typebox`) sur les routes Elysia.
- ORM **Prisma 7** (adapter `pg`) : `bun run db:generate` / `bun run db:push`.
  Migrations générées et appliquées en CI. Code généré dans `generated/` (ignoré du lint).
- Logging **pino** (`@bogeychan/elysia-logger`).
- Auth : **Lucia** + adapter Prisma (côté `api`).
- Tests : **`bun test`** (`test`, `test:watch`, `test:coverage`). Couverture
  **≥ 80 % obligatoire** (`bunfig.toml`).

### Front (`mythica-front`)
- **ESLint + Prettier** (PAS Biome — le front est exclu de la config Biome). `bun run lint`,
  `bun run format`, `bun run check` (svelte-check + paraglide).
- **SvelteKit** + **Tailwind** + **shadcn-svelte** (base color `slate`, alias `$lib/...`).
- i18n via **Paraglide** (`messages/`, compilé dans `src/lib/paraglide`).
- Les types API sont **générés** depuis Swagger : `bun run generate:types` (ne pas les
  éditer à la main, ils vivent dans `src/lib/api/generated/`).

### Commun
- `bun run lint` / `bun run lint:ci` à la racine couvrent tout le workspace.
- Pre-commit **lefthook** : Biome/Prettier sur les fichiers stagés + validation du
  message de commit. Installé via `bun install`.

---

## 6. Workflow par feature

1. **Brancher** : `feature/FEAT-XXX` (ou `feature/<nom>`).
2. **TDD** : développement test-driven, **≥ 80 % de couverture obligatoire** sur le
   code de la PR, **< 3 %** de duplication.
3. **Skills** : appliquer §4 (au minimum `frontend-design` pour l'UI, puis
   `code-review` / `simplify` / `verify` / `commit`).
4. **Vérifier** : `bun run lint` (+ `bun run check` côté front) **et vérification réelle
   en navigateur**.
5. **Commits** : Conventional Commits stricts en français (§7).
6. **PR** : pousser puis ouvrir une PR avec **base `staging`**.

Ne pas passer au ticket suivant sans validation explicite, et toujours confirmer le
merge de la PR précédente sur `staging` avant de continuer.

---

## 7. Règles de Commits — Conventional Commits

### Format obligatoire

```
<type>(<scope>): <description>
```

Tout commit **doit** respecter ce format. Aucune exception.

### Types autorisés

| Type       | Usage                                              | Exemple                                            |
|------------|----------------------------------------------------|----------------------------------------------------|
| `feat`     | Nouvelle fonctionnalité                            | `feat(auth): ajouter la page de login`             |
| `fix`      | Correction de bug                                  | `fix(cart): corriger le calcul du total`           |
| `docs`     | Documentation uniquement                           | `docs(readme): ajouter les instructions d'install` |
| `style`    | Formatage, espaces, virgules (pas de logique)      | `style(css): reformater les indentations`          |
| `refactor` | Refactoring sans changement de comportement        | `refactor(api): simplifier la logique de fetch`    |
| `test`     | Ajout ou modification de tests                     | `test(utils): ajouter tests pour formatDate()`     |
| `chore`    | Maintenance, config, dépendances                   | `chore(deps): mettre à jour eslint en v9`          |
| `ci`       | Changement dans la configuration CI/CD             | `ci(github): ajouter le workflow de déploiement`   |
| `perf`     | Amélioration des performances                      | `perf(images): optimiser le lazy loading`          |
| `build`    | Changement du système de build                     | `build(webpack): migrer vers vite`                 |

### Règles de rédaction

**Titre (ligne 1)**
- Toujours en **minuscules**
- **Impératif présent** : `ajouter`, `corriger`, `supprimer` — pas `ajouté`, `correction de`
- **Pas de point** à la fin · Maximum **72 caractères** · En **français**

**Scope (portée) — recommandé**
- Reflète le **module, fichier ou domaine** impacté, en minuscules sans espaces
- Scopes courants : `auth`, `api`, `ui`, `db`, `deps`, `config`, `ci`

**Body (corps) — optionnel**
- Séparé du titre par **une ligne vide** · Explique le **pourquoi** · Wrap à 72 caractères

**Footer — optionnel**
- Issues : `Closes #42`, `Refs #17` · Breaking : `BREAKING CHANGE: <description>`

### Exemples complets

```
feat(auth): ajouter la connexion via OAuth Google
```

```
fix(api): corriger le timeout sur les requêtes longues

Le délai par défaut de 5s était trop court pour les exports CSV.
Augmenté à 30s avec un fallback en streaming.

Closes #88
```

```
refactor(db): extraire la logique de pagination dans un helper

BREAKING CHANGE: la fonction getPaginated() attend désormais
un objet options au lieu de paramètres positionnels.
```

### Règles strictes à ne jamais enfreindre

- ❌ Ne jamais utiliser `git commit -m "fix"` ou des messages vagues
- ❌ Ne jamais mélanger plusieurs types dans un seul commit
- ❌ Ne jamais committer plusieurs fonctionnalités distinctes ensemble
- ❌ Ne jamais ajouter `Co-Authored-By: Claude` ou toute mention de Claude dans les commits
- ✅ Un commit = une intention claire et unique
- ✅ Si hésitation entre deux types → choisir le plus spécifique
- ✅ Toujours stager (`git add`) uniquement les fichiers liés au commit

# Design Patterns

Patterns réellement utilisés dans le code, avec leur localisation, la raison de
leur présence et leur effet sur la testabilité.

## 1. Singleton — connexions partagées

**Où** : [`apps/mythica-api/src/lib/prisma.ts`](../apps/mythica-api/src/lib/prisma.ts),
[`apps/mythica-api/src/lib/redis.ts`](../apps/mythica-api/src/lib/redis.ts),
[`apps/mythica-gameplay/src/lib/prisma.ts`](../apps/mythica-gameplay/src/lib/prisma.ts).

**Pourquoi ici** : Prisma et ioredis ouvrent des pools de connexions coûteux.
Une instance unique mémorisée sur `globalThis` (`globalForPrisma`, `globalForRedis`)
évite d'épuiser les connexions au rechargement à chaud en dev et garantit un
client partagé partout.

**Effet sur les tests** : le point d'accès unique permet d'injecter/remplacer le
client dans les tests sans traîner une instance par module.

## 2. Adapter — isoler une dépendance externe

**Où** : [`apps/mythica-api/src/lib/lucia-redis-adapter.ts`](../apps/mythica-api/src/lib/lucia-redis-adapter.ts)
(adapte Redis à l'interface de session attendue par Lucia) et l'adaptateur
`PrismaPg` qui branche Prisma sur le driver `pg` dans `prisma.ts`.

**Pourquoi ici** : Lucia attend une interface de stockage de sessions ; plutôt
que de coupler l'auth à Redis, l'adapter traduit l'une vers l'autre. Changer de
backend de session ne touche qu'un fichier.

**Effet sur les tests** : on peut fournir un faux adaptateur (in-memory) pour
tester l'authentification sans Redis réel.

## 3. Middleware / Chain of Responsibility — pipeline de requête

**Où** : composition Elysia via `.use()` dans
[`apps/mythica-api/src/index.ts`](../apps/mythica-api/src/index.ts) et
[`apps/mythica-gateway/src/index.ts`](../apps/mythica-gateway/src/index.ts)
(logger → health → CORS → auth/identité → contrôleurs), et le plugin
[`authContext`](../apps/mythica-gameplay/src/auth/context.ts) côté gameplay.

**Pourquoi ici** : chaque préoccupation transverse (logging, CORS, métriques,
résolution d'identité) est une couche indépendante et réordonnable, plutôt
qu'un bloc monolithique dans chaque handler.

**Effet sur les tests** : chaque couche (ex. `authContext` qui dérive
`currentUser` des en-têtes) se teste isolément.

## 4. Strategy — providers OAuth interchangeables

**Où** : [`apps/mythica-api/src/lib/oauth.ts`](../apps/mythica-api/src/lib/oauth.ts)
(Google, Discord, Apple via `arctic`).

**Pourquoi ici** : chaque provider implémente la même interface d'autorisation ;
le code appelant choisit la stratégie à l'exécution sans `if/else` géant. Ajouter
un provider = ajouter une stratégie, sans modifier les appelants (Open/Closed).

**Effet sur les tests** : chaque provider se teste indépendamment ; on peut
substituer une stratégie factice.

---

> **À compléter par l'auteur** : pour chaque pattern, ajouter le numéro de ligne
> exact et un mini-diagramme si le barème le valorise. Les justifications
> ci-dessus doivent être comprises et défendables à l'oral.

# Virtual Tabletop (VTT) — Design Spec

**Date :** 2026-06-24  
**Branche de départ :** `feature/campaign-character-sheets`  
**Statut :** Validé, en attente d'implémentation

---

## Contexte

Mythica dispose d'un backend de session complet (WebSocket, présence, tokens, combatState, chat SSE) mais n'a pas encore d'interface de jeu. L'objectif est de construire une table virtuelle inspirée de Roll20 et Foundry VTT, avec le design system Mythica (Bricolage Grotesque + Public Sans, fond gris froid, accent crimson).

Le projet est décomposé en 5 phases implémentées séquentiellement.

---

## Fondations existantes réutilisées

| Élément | Localisation | Usage |
|---|---|---|
| `Session.mapState` (JSONB) | `prisma/schema.prisma` | État de la carte (fog) |
| `Session.combatState` (JSONB) | `prisma/schema.prisma` | Initiative + tour actif |
| `SessionToken` | `prisma/schema.prisma` | Pions avec posX/posY/layer/isVisible |
| `SessionTokenOverride` | `prisma/schema.prisma` | Overrides temporaires de propriétés |
| WebSocket `/sessions/:id/ws` | `sessions.ws.ts` | Broadcast Redis pub/sub multi-instance |
| Présence WS | `session-presence-ws.ts` | PRESENCE_JOIN/LEAVE + délai de grâce 30s |
| Snapshot initial | `session-snapshot.ts` | Participants, mapState, activeTurn, 50 messages |
| Chat SSE | `/campaigns/:id/messages/stream` | Temps réel côté campagne |
| Fichiers S3/RustFS | `File` model, `FileDomain` | map, token, music |

---

## Architecture — Option A (validée)

### Rendu canvas : PixiJS

**Choix :** PixiJS (WebGL-first) — même stack que Foundry VTT. Les layers sont des `Container` Pixi indépendants.

| Layer | Responsabilité |
|---|---|
| `BackgroundLayer` | Sprite image de fond de la map |
| `GridLayer` | Grille SVG/Graphics (carré / hex / libre, configurable) |
| `DrawingsLayer` | Dessins MJ — murs, portes, zones (Phase 3) |
| `TokensLayer` | Pions drag & drop, synchronisés WS |
| `FogLayer` | Masque AlphaMaskFilter (Phase 1 : manuel ; Phase 2 : ligne de vue) |
| `LightingLayer` | Lumières et ombres (Phase 4) |

**Dés 3D :** Canvas Three.js/Threlte superposé en CSS `position: fixed` — aucun conflit avec PixiJS.

### Page dédiée

Route SvelteKit : `/sessions/[id]/table`

- Canvas PixiJS fullscreen (`100dvw × 100dvh`)
- Overlays DOM `position: fixed` : toolbar MJ, panneau initiative, panneau chat, présence, fiche personnage

### Synchronisation état

```
WS event → handler Svelte → $state update → $effect → mise à jour Layer Pixi ciblée
```

Pas de re-render global : chaque event WS touche uniquement le Layer concerné.

---

## Data model — extensions Prisma

### Modèle `Map` (Phase 1)

```prisma
enum GridType {
  square
  hex
  free
  @@map("grid_type")
}

model Map {
  id          String   @id @db.Uuid
  campaignId  String   @map("campaign_id") @db.Uuid
  nom         String   @db.VarChar(255)
  fileId      String?  @map("file_id") @db.Uuid        // FileDomain.map
  gridType    GridType @default(square) @map("grid_type")
  gridSize    Int      @default(100)   @map("grid_size") // pixels par case
  gridOffsetX Int      @default(0)    @map("grid_offset_x")
  gridOffsetY Int      @default(0)    @map("grid_offset_y")
  gridColor   String   @default("#ffffff33") @map("grid_color")
  gridOpacity Decimal  @default(0.3)  @map("grid_opacity") @db.Decimal
  widthPx     Int      @default(2000) @map("width_px")
  heightPx    Int      @default(2000) @map("height_px")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt     @map("updated_at") @db.Timestamptz

  campaign Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  file     File?     @relation("MapFile", fields: [fileId], references: [id], onDelete: SetNull)
  sessions Session[] @relation("SessionActiveMap")

  @@index([campaignId], name: "idx_maps_campaign")
  @@map("maps")
}
```

Extension `Session` :
```prisma
activeMapId String? @map("active_map_id") @db.Uuid
activeMap   Map?    @relation("SessionActiveMap", fields: [activeMapId], references: [id])
```

`Session.mapState` conservé pour le fog state volatil :
```typescript
// FogState format
type FogState = {
  mode: "manual" | "dynamic";
  revealed: Array<{ x: number; y: number }[]>; // polygones révélés
};
```

### Extension `Message` (Phase 1)

Ajout de `sessionId` nullable et `kind` sur le modèle `Message` existant — pas de nouveau modèle.

```prisma
// Sur Message
sessionId String? @map("session_id") @db.Uuid
kind      String? @db.VarChar(50)    // null = chat normal, "dice_roll" = jet de dés
```

### Modèle `MapDrawing` (Phase 3)

```prisma
enum DrawingType {
  wall door window area marker
  @@map("drawing_type")
}

model MapDrawing {
  id         String      @id @db.Uuid
  mapId      String      @map("map_id") @db.Uuid
  type       DrawingType
  points     Json        // Array<{ x: number; y: number }>
  color      String?     @db.VarChar(9)
  opacity    Decimal?    @db.Decimal
  isBlocking Boolean     @default(true) @map("is_blocking") // bloque la vue (fog dynamique)
  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime    @updatedAt     @map("updated_at") @db.Timestamptz

  map Map @relation(fields: [mapId], references: [id], onDelete: Cascade)
  @@map("map_drawings")
}
```

### Modèle `TokenCondition` (Phase 4)

```prisma
model TokenCondition {
  id             String   @id @db.Uuid
  sessionTokenId String   @map("session_token_id") @db.Uuid
  conditionKey   String   @map("condition_key") @db.VarChar(100)
  sourceId       String?  @map("source_id") @db.Uuid // token source de l'effet
  duration       Int?     // rounds restants (null = permanent)
  data           Json     @default("{}")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  sessionToken SessionToken @relation(fields: [sessionTokenId], references: [id], onDelete: Cascade)
  @@map("token_conditions")
}
```

---

## Protocole WebSocket — events

### Existants (inchangés)

| Event | Émetteur | Description |
|---|---|---|
| `snapshot` | Serveur | État initial complet à la connexion |
| `PRESENCE_JOIN` / `PRESENCE_LEAVE` | Serveur | Tracking présence |
| `COMBAT_START` | Client MJ | Démarrer combat avec ordre d'initiative |
| `TURN_NEXT` / `TURN_SET` | Client MJ | Navigation de tour |

### Phase 1 — nouveaux events

| Direction | Event | Payload |
|---|---|---|
| C→S→C | `TOKEN_MOVE` | `{ tokenId: string, x: number, y: number }` |
| C→S→C | `TOKEN_ADD` | `{ characterSheetId?, label?, fileId?, x, y, layer }` |
| C→S→C | `TOKEN_REMOVE` | `{ tokenId: string }` |
| C→S→C | `TOKEN_UPDATE` | `{ tokenId: string, isVisible?, width?, height?, label? }` |
| C→S→C | `MAP_CHANGE` | `{ mapId: string }` |
| C→S→C | `FOG_PAINT` | `{ polygons: Array<{x:number,y:number}[]> }` |
| C→S→C | `FOG_CLEAR` | `{}` |
| C→S→C | `DICE_ROLL` | `{ formula: string, results: number[], total: number, isPrivate: boolean }` |

Tous les events C→S sont **persistés en DB** (ou dans `mapState`) avant broadcast, sauf `DICE_ROLL` privé.

### Phase 2 — fog dynamique

| Direction | Event | Payload |
|---|---|---|
| C→S→C | `FOG_REVEAL_AROUND` | `{ tokenId: string, radius: number }` |

### Phase 3 — outils MJ

| Direction | Event | Payload |
|---|---|---|
| C→S→C | `DRAWING_ADD` | `{ mapId, type, points[], color?, isBlocking }` |
| C→S→C | `DRAWING_UPDATE` | `{ drawingId, points?, color? }` |
| C→S→C | `DRAWING_REMOVE` | `{ drawingId: string }` |
| C→S→C | `AMBIENCE_PLAY` | `{ fileId: string, volume: number, loop: boolean }` |
| C→S→C | `AMBIENCE_STOP` | `{}` |

### Phase 4 — automation

| Direction | Event | Payload |
|---|---|---|
| C→S→C | `CONDITION_APPLY` | `{ targetTokenId, conditionKey, duration?, data? }` |
| C→S→C | `CONDITION_REMOVE` | `{ conditionId: string }` |

---

## Phase 1 — Détail d'implémentation

### Backend (`mythica-gameplay`)

**Nouvelles routes REST :**

```
# Maps (MJ uniquement)
GET    /campaigns/:id/maps              — liste des maps de la campagne
POST   /campaigns/:id/maps              — créer une map
GET    /campaigns/:id/maps/:mapId       — détail d'une map
PATCH  /campaigns/:id/maps/:mapId       — modifier (grille, nom)
DELETE /campaigns/:id/maps/:mapId       — supprimer
POST   /campaigns/:id/maps/:mapId/file  — upload image de fond (multipart)

# Session — carte active
PUT    /sessions/:id/map                — changer la map active → émet MAP_CHANGE WS

# Tokens en session
GET    /sessions/:id/tokens             — liste des tokens (aussi dans snapshot)
POST   /sessions/:id/tokens             — créer → émet TOKEN_ADD WS
PATCH  /sessions/:id/tokens/:tokenId    — modifier → émet TOKEN_UPDATE WS
DELETE /sessions/:id/tokens/:tokenId    — supprimer → émet TOKEN_REMOVE WS
```

**Handlers WS ajoutés dans `sessions.ws.ts` :**

- `TOKEN_MOVE` → update `posX/posY` en DB + broadcast
- `MAP_CHANGE` → update `Session.activeMapId` + broadcast
- `FOG_PAINT/FOG_CLEAR` → merge/reset `Session.mapState.fog` + broadcast
- `DICE_ROLL` → broadcast (+ persist si public)

**Snapshot enrichi (`session-snapshot.ts`) :**

```typescript
type SessionSnapshot = {
  type: "snapshot";
  participants: string[];
  activeMap: MapConfig | null;
  mapState: { fog: FogState };
  tokens: SessionTokenDto[];
  activeTurn: string | null;
  combatOrder: CombatEntry[];
  messages: SnapshotMessage[];
};
```

**Couverture tests :** ≥ 80 % sur tous les nouveaux handlers et routes.

### Frontend (`mythica-front`)

**Structure du module VTT :**

```
src/lib/vtt/
  VttCanvas.svelte              — monte PixiJS Application, gère resize/cleanup
  vtt.svelte.ts                 — stores $state globaux (tokens, fog, activeMap, combat)
  layers/
    BackgroundLayer.ts          — sprite image de fond
    GridLayer.ts                — dispatch vers SquareGrid/HexGrid/FreeGrid
    TokensLayer.ts              — container de TokenSprite, gestion sélection
    FogLayer.ts                 — masque AlphaMaskFilter ou Graphics polygone
  grid/
    SquareGrid.ts               — grille carrée (Pixi Graphics)
    HexGrid.ts                  — grille hexagonale (calcul offset/pointy-top)
    FreeGrid.ts                 — aucune grille (snap désactivé)
  tokens/
    TokenSprite.ts              — sprite + drag interactif + tooltip au hover
  ws/
    VttWebSocket.ts             — connexion avec reconnection exponentielle backoff
    handlers/
      token.handler.ts
      fog.handler.ts
      map.handler.ts
      combat.handler.ts
      presence.handler.ts
  panels/
    VttToolbar.svelte           — outils MJ (select, move, fog paint, add token)
    VttInitiativePanel.svelte   — initiative tracker (combatState)
    VttChatPanel.svelte         — chat ancré (SSE existant réutilisé)
    VttPresenceBar.svelte       — avatars joueurs connectés
    VttFogControls.svelte       — mode fog, peindre/effacer

src/routes/(platform)/sessions/[id]/table/
  +page.svelte                  — page principale VTT
  +page.ts                      — load session + vérification accès
```

**Gestion de l'état :**

```typescript
// vtt.svelte.ts — $state Svelte 5
// FogState = { mode: "manual" | "dynamic", revealed: Array<{x:number,y:number}[]> }
let tokens = $state<SessionTokenDto[]>([]);
let fog = $state<FogState>({ mode: "manual", revealed: [] });
let activeMap = $state<MapConfig | null>(null);
let combatState = $state<CombatState>({ started: false, order: [], activeIndex: 0 });
let participants = $state<string[]>([]);
```

**Dépendances à ajouter :**

```json
{
  "pixi.js": "^8.x"
}
```

---

## Phases 2–5 (vue haute)

### Phase 2 — Fog dynamique + Fiches en session (~6-8 sem)

- **Backend :** Algorithme raycasting (line-of-sight) depuis `posX/posY` du token, obstacles = `MapDrawing.isBlocking`. Handler WS `FOG_REVEAL_AROUND`. Résultat = polygone de visibilité broadcasté.
- **Frontend :** FogLayer dynamique (polygone calculé). Fenêtre flottante + panneau latéral pour fiche (`CampaignCharacterSheet` actif). Raccourcis jets de dés sur les stats. Dés 2D animés (CSS/Canvas).

### Phase 3 — Outils MJ + Audio (~4-6 sem)

- **Dessin :** Mode "dessin" dans toolbar PixiJS. Types : mur, porte, fenêtre, zone, marqueur. Persisté dans `MapDrawing`. Sync WS `DRAWING_*`.
- **Audio :** `FileDomain.music`. MJ upload → `AMBIENCE_PLAY` → joueurs jouent via `<audio>` HTML. Contrôle volume + loop.
- **Tuiles :** Drag & drop de tuiles PNG sur la map, persistées comme `SessionToken` layer `background`.

### Phase 4 — Automation + Dés 3D (~8-10 sem)

- **Conditions :** `TokenCondition` model. Handler WS `CONDITION_APPLY/REMOVE`. Icônes sur tokens. Décompte automatique rounds à `TURN_NEXT`.
- **Dés 3D :** `@threlte/core` + `cannon-es`. Canvas Three.js `position: fixed`. Animation locale, résultat envoyé en WS.
- **Macros :** Boutons MJ associés à formules dés ou commandes WS.

### Phase 5 — Mobile companion (~4-6 sem)

App `mythica-mobile` (Expo). Fiche de personnage active, jets de dés (notation standard), notes de session, map en lecture seule + déplacement de son token. Protocole WS identique.

---

## Fichiers critiques — Phase 1

### Backend

| Fichier | Action |
|---|---|
| `apps/mythica-gameplay/prisma/schema.prisma` | Ajouter `Map`, `GridType`, extension `Session` |
| `apps/mythica-gameplay/src/campaigns/sessions.ws.ts` | Handlers TOKEN_*, MAP_CHANGE, FOG_* |
| `apps/mythica-gameplay/src/campaigns/session-snapshot.ts` | Enrichir snapshot (activeMap, tokens, combatOrder) |
| `apps/mythica-gameplay/src/maps/maps.controller.ts` | Nouveau module maps |
| `apps/mythica-gameplay/src/maps/maps.service.ts` | CRUD maps + upload |
| `apps/mythica-gameplay/src/campaigns/session-tokens.ts` | CRUD tokens en session |

### Frontend

| Fichier | Action |
|---|---|
| `apps/mythica-front/src/routes/(platform)/sessions/[id]/table/+page.svelte` | Nouveau |
| `apps/mythica-front/src/lib/vtt/` | Tout nouveau module |
| `apps/mythica-front/src/lib/api/generated/` | Régénérer (`bun run generate:types`) |
| `apps/mythica-front/package.json` | Ajouter `pixi.js` |

---

## Vérification Phase 1

1. `bun run db:generate && bun run db:push` dans `mythica-gameplay` — migrations OK
2. `bun test` dans `mythica-gameplay` — ≥ 80 % couverture sur les nouveaux fichiers
3. `bun run lint:ci` à la racine — 0 erreur
4. `docker compose up -d` + `bun run dev` dans gameplay et front
5. Créer une campagne → créer une session → naviguer `/sessions/[id]/table`
6. MJ upload une image → vérifier affichage PixiJS dans le navigateur
7. MJ ajoute un token → vérifier apparition instantanée dans un 2e onglet (joueur)
8. Drag d'un token → synchronisation temps réel confirmée
9. MJ peint fog → zones masquées côté joueur
10. Chat SSE visible dans le panneau ancré, messages en temps réel

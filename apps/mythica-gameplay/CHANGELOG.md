# @mythica/gameplay

## 1.2.0

### Minor Changes

- 03fd4cb: [CAMPAIGN] Salle d'attente de session (lobby) : présence des joueurs en temps réel (SSE), statut de session et lancement par le MJ

  _Généré automatiquement le 2026-06-15T08:58:36.000Z_

- 9e41ab4: [FEAT-27] [CAMPAIGN] Page salle d'attente avant session (lobby)

  _Généré automatiquement le 2026-06-15T09:00:49.318Z_

- dbd1412: [WS] Serveur WebSocket des sessions : handler /sessions/:id/ws authentifié (cookie validé par le gateway, identité propagée, accès réservé aux membres)

  _Généré automatiquement le 2026-06-15T09:54:19.000Z_

- 5f7e2c3: [FEAT-28] [WS] Setup serveur WebSocket ElysiaJS (plugin @elysiajs/ws)

  _Généré automatiquement le 2026-06-15T10:00:37.839Z_

- b2abbfc: [WS] Gestion des rooms par session : Map<sessionId, Set<ws>> en mémoire + pub/sub Redis pour la diffusion multi-instance

  _Généré automatiquement le 2026-06-15T12:15:10.000Z_

- ffedd36: [FEAT-29] [WS] Gestion des rooms par session (Map en mémoire + Redis)

  _Généré automatiquement le 2026-06-15T12:16:02.127Z_

- d35aa75: [WS] Événements de présence : PRESENCE_JOIN / PRESENCE_LEAVE diffusés à la room, avec délai de grâce de 30s pour la reconnexion

  _Généré automatiquement le 2026-06-15T13:14:51.000Z_

- e89c47a: [FEAT-30] [WS] Événements de présence (join / leave / reconnect)

  _Généré automatiquement le 2026-06-15T13:15:37.188Z_

- 35bc3cd: [WS] Snapshot initial au join : à la connexion, le client reçoit participants présents, état de la carte, tour actif et 50 derniers messages de chat

  _Généré automatiquement le 2026-06-15T14:03:20.000Z_

- 2d171b4: [FEAT-32] [WS] Broadcast état initial de session au join

  _Généré automatiquement le 2026-06-15T14:03:59.706Z_

- 661e5b2: [WS] Suivi de tour de combat (initiative) : commandes COMBAT_START / TURN_NEXT / TURN_SET réservées au MJ, ordre persisté dans la session et diffusé à la room

  _Généré automatiquement le 2026-06-15T14:12:59.000Z_

- 0c18d2c: [FEAT-33] [WS] Système de tour de combat (initiative tracker)

  _Généré automatiquement le 2026-06-15T14:14:00.811Z_

- c7a7422: [CHARACTER] Modèle DB Character (id, userId, campaignId, system, name, data JSON, sheetTemplate) : personnage léger dont les stats sont stockées en JSON selon le système

  _Généré automatiquement le 2026-06-15T14:51:28.000Z_

- 47223c7: [FEAT-35] [CHARACTER] Modèle DB Character

  _Généré automatiquement le 2026-06-15T14:52:13.692Z_

- 89080f2: [SYSTEM] Seed des systèmes de jeu officiels : D&D5e 2014, D&D5e 2024 (hérite de 2014), CoC 7e, PF2e — via prisma db seed (idempotent)

  _Généré automatiquement le 2026-06-16T08:06:36.000Z_

- c4e910a: [FEAT-158] [SYSTEM] Seed game systems officiels (D&D5e 2014, D&D5e 2024, CoC 7e, PF2e)

  _Généré automatiquement le 2026-06-16T08:07:19.908Z_

- dd66bc1: [SYSTEM] Seed du mapping système ↔ propriété pour D&D 5e 2014 (`game_system_properties`) : les 40 propriétés de fiche sont liées au système `dnd5e-2014` avec ordre d'affichage, groupes (Caractéristiques, Combat, Compétences, Sorts, Ressources), caractère obligatoire et formule dérivée (`initiative = dex_modifier`). Résolution par clés naturelles (`slug`/`key`), id en UUID v7, upsert idempotent via `prisma db seed`.
- a2c1676: [SYSTEM] Seed des propriétés de fiche D&D 5e 2024 (`dnd5e-2024`) : réutilisation intégrale du catalogue 2014 via `game_system_properties` (mêmes `property_id`, résolus par `key`) + ajout des nouveautés 2024 (épuisement numérique 0-6). Mapping seedé par un helper générique partagé entre éditions, id en UUID v7, upsert idempotent.
- fc7efb3: [FEAT-161] [SYSTEM] Seed propriétés D&D 5e 2024 (réutilisation + nouveautés)

  _Généré automatiquement le 2026-06-16T09:23:13.811Z_

- c657847: [SYSTEM] Seed des propriétés de fiche Call of Cthulhu 7e (`coc-7e`) : 8 caractéristiques en %, santé mentale / points de vie / points de magie (resource), 56 compétences d'investigateur (valeurs de base 7e), armes (list) et crédit. Keys préfixées `coc_` (uniques globalement), mapping seedé via le helper générique, id en UUID v7, idempotent.
- 653b1b2: [SYSTEM] Seed des propriétés de fiche Pathfinder 2e (`pf2e`) : 6 caractéristiques, CA, points de vie, actions (0-3) / réaction / points de focus / emplacements par tradition (resource), conditions (multiselect) et compétences. Keys préfixées `pf2e_` (uniques globalement), mapping seedé via le helper générique, id en UUID v7, idempotent.
- 7638ea2: [SYSTEM] API `GET /game-systems/:id/properties` : retourne la fiche type d'un système (game_system_properties joints au détail de chaque propriété : key, label, type, options, defaultValue, groupName, displayOrder, formula), triée par displayOrder, avec application des override_label/override_default. Support du rendu dynamique de fiche côté front.
- 1f436fe: [FEAT-165] [SYSTEM] API GET /game-systems/:id/properties (fiche type d'un système)

  _Généré automatiquement le 2026-06-16T09:48:52.019Z_

- 380afef: [SYSTEM] `POST /game-systems` permet désormais à tout utilisateur authentifié de créer un système custom (`isOfficial` forcé à false pour les non-admins). Si `parentSystemId` est fourni, les `game_system_properties` du parent sont copiées dans une transaction comme point de départ (fork).
- 8b582db: [FEAT-166] [SYSTEM] Création d'un système custom (fork depuis un existant ou from scratch)

  _Généré automatiquement le 2026-06-16T09:52:44.836Z_

- f531647: [SYSTEM] CRUD des propriétés d'un système : `POST /game-systems/:id/properties` (attacher une propriété existante par id ou key), `PATCH /game-systems/:id/properties/:propertyId` (override_label, display_order, formula, groupName, isRequired, override_default) et `DELETE /game-systems/:id/properties/:propertyId` (retirer le mapping sans supprimer la propriété globale). Permet au MJ de personnaliser un système custom.
- de658a6: [FEAT-167] [SYSTEM] API CRUD game_system_properties (ajouter/retirer/réordonner propriétés)

  _Généré automatiquement le 2026-06-16T09:57:07.328Z_

- 0531c00: [SYSTEM] API `POST /character-sheet-properties` : crée une propriété de fiche globale réutilisable (key unique, label, type, defaultValue, options). Si la key existe déjà, renvoie 409 avec l'id existant pour proposer la réutilisation plutôt qu'un doublon.
- 31a14c5: [FEAT-168] [SYSTEM] API POST /character-sheet-properties (créer une propriété réutilisable)

  _Généré automatiquement le 2026-06-16T10:01:13.087Z_

- 8eca36b: [CAMPAIGN] Fiches de personnage liées à une campagne : `POST /campaigns/:id/character-sheets/:sheetId` (importer une fiche que l'on possède, membre de la campagne, système compatible parent/enfant), `GET /campaigns/:id/character-sheets` (le MJ voit toutes les fiches, un joueur voit la sienne) et `DELETE /campaigns/:id/character-sheets/:sheetId` (retirer le lien sans supprimer la fiche ; propriétaire ou MJ).
- 928fab5: [FEAT-178] [CAMPAIGN] API POST /campaigns/:id/character-sheets/:sheetId (importer une fiche)

  _Généré automatiquement le 2026-06-16T10:13:29.301Z_

- 99eccd6: [SYSTEM] Seed du catalogue des propriétés de fiche D&D 5e 2014 (`character_sheet_properties`) : 6 caractéristiques, hp, dés de vie, 9 emplacements de sorts, CA, niveau, vitesse, 18 compétences en maîtrise, inspiration et initiative (dérivée). Upsert idempotent via `prisma db seed`. Le mapping système ↔ propriété (`game_system_properties`) est traité dans FEAT-160 (hors scope).
- ba2e7e3: [FEAT-162] [SYSTEM] Seed propriétés Call of Cthulhu 7e

  _Généré automatiquement le 2026-06-16T14:10:52.832Z_

- b706a7e: [CHARACTER] API des fiches de personnage standalone : `POST /character-sheets` (créer une fiche et initialiser les valeurs des propriétés requises avec leur défaut résolu), `GET /character-sheets` (mes fiches, filtre `?gameSystemId`), `GET /character-sheets/:id` (détail : fiche type fusionnée avec les valeurs saisies, triée par displayOrder) et `PATCH /character-sheets/:id/values` (auto-save par lot avec upsert). Réservé au propriétaire ; les propriétés dérivées exposent leur formule (calcul côté client). FEAT-185, FEAT-186, FEAT-187, FEAT-188.

### Patch Changes

- e2654dd: [CHARACTER] Nettoyage : retrait de l'API Character (code mort) de la plateforme et du modèle Character blob du gameplay, en préparation de la fiche dynamique normalisée (CharacterSheet + game_system_properties)

  _Généré automatiquement le 2026-06-16T07:48:09.000Z_

- b72076b: [ID] Générer tous les identifiants applicatifs en UUID v7 (indexables, ordonnés dans le temps, non prédictibles) au lieu d'UUID v4. Ajout d'un helper `newId()` côté gameplay et api, remplacement des `crypto.randomUUID()` runtime, et passage des défauts Prisma de l'api en `@default(uuid(7))`. Aligne le runtime sur le seed (déjà en v7).

## 1.1.0

### Minor Changes

- d215a26: [FEAT-19] [CAMPAIGN] Modèle DB Campagne et CampaignMember (Prisma)

  _Généré automatiquement le 2026-04-28T07:53:22.900Z_

- 18f8c3a: [FEAT-17] [AUTH] Système d'invitation par lien (token unique)

  _Généré automatiquement le 2026-06-12T11:40:02.354Z_

- 46bae71: [FEAT-20] [CAMPAIGN] API CRUD campagne (POST/GET/PATCH/DELETE)

  _Généré automatiquement le 2026-06-12T17:58:19.487Z_

- 59eb718: [FEAT-21] [CAMPAIGN] Page dashboard : liste des campagnes

  _Généré automatiquement le 2026-06-12T18:30:19.902Z_

- 3aa5d80: [FEAT-22] [CAMPAIGN] Page création de campagne : image de couverture

  _Généré automatiquement le 2026-06-12T19:44:28.000Z_

- 6c46c6f: [FEAT-23] [CAMPAIGN] Page détail campagne (vue MJ)

  _Généré automatiquement le 2026-06-12T19:56:45.000Z_

- 1e1d2ca: [CAMPAIGN] Chat temps réel (SSE + Redis) sur la page détail

  _Généré automatiquement le 2026-06-12T20:34:37.003Z_

- 3e332bd: [CAMPAIGN] Pseudos : miroir utilisateur enrichi + affichage (membres, chat)

  _Généré automatiquement le 2026-06-13T15:31:25.005Z_

- 09d64af: [CAMPAIGN] Demande d'accès aux campagnes publiques (validation par le MJ)

  _Généré automatiquement le 2026-06-13T15:40:15.006Z_

- 04b5417: [CAMPAIGN] Tags de campagne (saisie, édition, affichage cartes/détail)

  _Généré automatiquement le 2026-06-13T19:18:09.008Z_

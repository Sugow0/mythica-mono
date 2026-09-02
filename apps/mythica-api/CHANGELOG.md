# @mythica/api

## 1.1.1

### Patch Changes

- e2654dd: [CHARACTER] Nettoyage : retrait de l'API Character (code mort) de la plateforme et du modèle Character blob du gameplay, en préparation de la fiche dynamique normalisée (CharacterSheet + game_system_properties)

  _Généré automatiquement le 2026-06-16T07:48:09.000Z_

- b72076b: [ID] Générer tous les identifiants applicatifs en UUID v7 (indexables, ordonnés dans le temps, non prédictibles) au lieu d'UUID v4. Ajout d'un helper `newId()` côté gameplay et api, remplacement des `crypto.randomUUID()` runtime, et passage des défauts Prisma de l'api en `@default(uuid(7))`. Aligne le runtime sur le seed (déjà en v7).
- 43964f3: [PLATFORM] Nettoyage : retrait des controllers Campaigns et GameSystems (code mort) de la plateforme. Ces endpoints référençaient des modèles Prisma absents du schéma plateforme (qui ne contient que l'auth) ; les vraies implémentations vivent dans le service gameplay, que le front consomme déjà via generated/gameplay. Régénération des types plateforme front en conséquence.

  _Généré automatiquement le 2026-06-16T10:15:00.000Z_

## 1.1.0

### Minor Changes

- 725d7de: [FEAT-1] FEAT-1

  _Généré automatiquement le 2026-04-20T19:39:35.876Z_

- d215a26: [FEAT-19] [CAMPAIGN] Modèle DB Campagne et CampaignMember (Prisma)

  _Généré automatiquement le 2026-04-28T07:53:22.900Z_

- ca1b3dc: [FEAT-16] [AUTH] Page de profil utilisateur (avatar, pseudo, bio)

  _Généré automatiquement le 2026-06-12T11:09:54.566Z_

- a0eb1fa: [FEAT-18] [AUTH] Page de réinitialisation de mot de passe

  _Généré automatiquement le 2026-06-12T12:08:04.236Z_

- 3e332bd: [CAMPAIGN] Pseudos : miroir utilisateur enrichi + affichage (membres, chat)

  _Généré automatiquement le 2026-06-13T15:31:25.005Z_

---
"@mythica/gameplay": minor
---

[SYSTEM] `POST /game-systems` permet désormais à tout utilisateur authentifié de créer un système custom (`isOfficial` forcé à false pour les non-admins). Si `parentSystemId` est fourni, les `game_system_properties` du parent sont copiées dans une transaction comme point de départ (fork).

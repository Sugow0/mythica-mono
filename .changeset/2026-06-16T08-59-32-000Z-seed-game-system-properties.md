---
"@mythica/gameplay": minor
---

[SYSTEM] Seed du mapping système ↔ propriété pour D&D 5e 2014 (`game_system_properties`) : les 40 propriétés de fiche sont liées au système `dnd5e-2014` avec ordre d'affichage, groupes (Caractéristiques, Combat, Compétences, Sorts, Ressources), caractère obligatoire et formule dérivée (`initiative = dex_modifier`). Résolution par clés naturelles (`slug`/`key`), id en UUID v7, upsert idempotent via `prisma db seed`.

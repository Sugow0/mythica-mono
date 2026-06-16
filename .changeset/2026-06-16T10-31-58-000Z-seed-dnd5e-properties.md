---
"@mythica/gameplay": minor
---

[SYSTEM] Seed du catalogue des propriétés de fiche D&D 5e 2014 (`character_sheet_properties`) : 6 caractéristiques, hp, dés de vie, 9 emplacements de sorts, CA, niveau, vitesse, 18 compétences en maîtrise, inspiration et initiative (dérivée). Upsert idempotent via `prisma db seed`. Le mapping système ↔ propriété (`game_system_properties`) est traité dans FEAT-160 (hors scope).

---
"@mythica/gameplay": minor
---

[SYSTEM] API `POST /character-sheet-properties` : crée une propriété de fiche globale réutilisable (key unique, label, type, defaultValue, options). Si la key existe déjà, renvoie 409 avec l'id existant pour proposer la réutilisation plutôt qu'un doublon.

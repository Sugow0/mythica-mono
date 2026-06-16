---
"@mythica/gameplay": minor
---

[CHARACTER] API des fiches de personnage standalone : `POST /character-sheets` (créer une fiche et initialiser les valeurs des propriétés requises avec leur défaut résolu), `GET /character-sheets` (mes fiches, filtre `?gameSystemId`), `GET /character-sheets/:id` (détail : fiche type fusionnée avec les valeurs saisies, triée par displayOrder) et `PATCH /character-sheets/:id/values` (auto-save par lot avec upsert). Réservé au propriétaire ; les propriétés dérivées exposent leur formule (calcul côté client). FEAT-185, FEAT-186, FEAT-187, FEAT-188.

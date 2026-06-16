---
"@mythica/gameplay": minor
---

[SYSTEM] API `GET /game-systems/:id/properties` : retourne la fiche type d'un système (game_system_properties joints au détail de chaque propriété : key, label, type, options, defaultValue, groupName, displayOrder, formula), triée par displayOrder, avec application des override_label/override_default. Support du rendu dynamique de fiche côté front.

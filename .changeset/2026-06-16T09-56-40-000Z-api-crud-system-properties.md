---
"@mythica/gameplay": minor
---

[SYSTEM] CRUD des propriétés d'un système : `POST /game-systems/:id/properties` (attacher une propriété existante par id ou key), `PATCH /game-systems/:id/properties/:propertyId` (override_label, display_order, formula, groupName, isRequired, override_default) et `DELETE /game-systems/:id/properties/:propertyId` (retirer le mapping sans supprimer la propriété globale). Permet au MJ de personnaliser un système custom.

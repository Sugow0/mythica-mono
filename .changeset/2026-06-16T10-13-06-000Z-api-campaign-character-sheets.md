---
"@mythica/gameplay": minor
---

[CAMPAIGN] Fiches de personnage liées à une campagne : `POST /campaigns/:id/character-sheets/:sheetId` (importer une fiche que l'on possède, membre de la campagne, système compatible parent/enfant), `GET /campaigns/:id/character-sheets` (le MJ voit toutes les fiches, un joueur voit la sienne) et `DELETE /campaigns/:id/character-sheets/:sheetId` (retirer le lien sans supprimer la fiche ; propriétaire ou MJ).

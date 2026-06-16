---
"@mythica/api": patch
"@mythica/front": patch
---

[PLATFORM] Nettoyage : retrait des controllers Campaigns et GameSystems (code mort) de la plateforme. Ces endpoints référençaient des modèles Prisma absents du schéma plateforme (qui ne contient que l'auth) ; les vraies implémentations vivent dans le service gameplay, que le front consomme déjà via generated/gameplay. Régénération des types plateforme front en conséquence.

_Généré automatiquement le 2026-06-16T10:15:00.000Z_

---
"@mythica/gameplay": minor
---

[CAMPAIGN] Complète l'API campagnes : `GET /campaigns/:id` retourne désormais les sessions et les fiches liées ; le changement de rôle refuse de rétrograder le dernier MJ (409) ; le retrait d'un membre (kick ou départ) supprime ses liens de fiches dans la campagne (sans supprimer la fiche elle-même).

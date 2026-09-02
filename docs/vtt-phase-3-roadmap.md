# Plan de Développement : VTT Phase 3 (Interface "Apple" & Ergonomie)

Cette phase s'annonce passionnante ! D'après vos choix, nous allons créer une expérience utilisateur (UX) ultra-fluide, minimaliste et puissante, bien loin des menus surchargés classiques.

Voici la proposition de feuille de route (roadmap) découpée en étapes logiques pour garantir la stabilité à chaque ajout.

## Étape 1 : Déplacements millimétrés et Mesures (Le Socle)
Avant d'ajouter des murs ou des combats, le système de déplacement doit être irréprochable.
- **Magnétisme (Snap to grid)** : Lorsque vous relâchez un token, il se positionne parfaitement au centre de la case (ou du croisement, selon la configuration).
- **Indicateur de distance en temps réel** : Pendant le "drag", une ligne fluide s'affiche entre le point de départ et le token, indiquant la distance parcourue (ex: "9 m").
- **Outil Règle (Ruler)** : Un nouvel outil dans la barre d'outils (ou raccourci, ex: Clic droit + glisser) permettant à tous les joueurs de tracer des lignes de mesure sans déplacer leur token.

## Étape 2 : Le Token HUD (Mini-menu contextuel)
Une interface flottante élégante (façon Apple Watch) qui apparaît au clic ou au survol d'un token sélectionné.
- **Bulle de PV** : Permet de voir et de modifier la santé (ex: taper "-8" pour appliquer des dégâts).
- **Statuts rapides** : Un menu circulaire ou une barre minimaliste pour ajouter des icônes d'état (Concentration, À terre, Empoisonné...).
- **Actions rapides** : Bouton de suppression, ou verrouillage du token.

## Étape 3 : La Timeline d'Initiative
Fini le lourd panneau latéral !
- **Design Horizontal** : Une barre discrète en haut de l'écran affichant l'ordre des tours avec l'avatar des tokens.
- **Caméra intelligente** : Au changement de tour, la caméra se déplace en douceur (pan) pour centrer l'action sur le token actif.
- **Ergonomie MJ** : Boutons élégants pour passer au tour suivant, ajouter des monstres à l'initiative, ou lancer les dés pour tout le monde.

## Étape 4 : L'Architecture des Murs & Vision Dynamique (Le gros morceau)
Implémenter "Les 3" options demandées demande une refonte du système de rendu du canvas.
- **Murs (Outil MJ)** : Capacité de tracer des lignes invisibles pour les joueurs qui bloquent le mouvement et la ligne de vue.
- **Brouillard Dynamique (Auto-exploration)** : Calcul d'ombres 2D (Raycasting) depuis le token contrôlé par le joueur. Le brouillard se dissipe de manière fluide à mesure qu'il avance, en butant sur les murs.
- **Amélioration du brouillard manuel** : Garder le pinceau pour les zones magiques ou spécifiques, avec des formes géométriques.

---

### Comment procéder ?
Si cette feuille de route vous convient, je vous propose de commencer dès maintenant par l'**Étape 1 : Déplacements, Magnétisme et Mesure**. 

*Cliquez sur "Proceed" pour que je commence le code de l'Étape 1, ou laissez un commentaire si vous souhaitez ajuster les priorités !*

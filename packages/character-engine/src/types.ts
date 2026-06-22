/**
 * Types fondamentaux du moteur de création de personnage.
 *
 * Tout est **agnostique au système de jeu** : aucune notion de race, classe ou
 * sort n'apparaît ici. Un système décrit son parcours de création via un
 * `CreationFlow` composé d'étapes typées (`CreationStep`), et l'interaction de
 * ses caractéristiques via des formules (voir `formula.ts`).
 */

/** Jeu de valeurs de caractéristiques, indexé par clé de propriété. */
export type AbilityScores = Record<string, number>;

/**
 * Catégorie de lanceur de sorts (utilisée par les calculs d'emplacements). Reste
 * ici car c'est une donnée de configuration, pas du contenu : un système qui
 * n'a pas de magie n'utilise simplement jamais ces valeurs.
 */
export type CasterType = "full" | "half" | "third" | "warlock" | "none";

/** Une classe choisie dans un build (multiclassage = plusieurs entrées). */
export type ClassBuild = {
	/** Slug du contenu de classe sélectionné. */
	slug: string;
	/** Niveau atteint dans cette classe. */
	level: number;
	/** Catégorie de lanceur de la classe (défaut : `none`). */
	casterType?: CasterType;
};

/** Méthodes de génération des caractéristiques proposables par un système. */
export type AbilityScoreMethod =
	| "standard_array"
	| "point_buy"
	| "dice_roll"
	| "manual";

/** Méthodes de détermination des points de vie. */
export type HitPointsMethod = "average" | "roll" | "manual";

/** Discriminant des types d'étapes génériques du wizard. */
export type CreationStepKind =
	| "selection"
	| "repeatableSelection"
	| "pointAllocation"
	| "hitPoints"
	| "proficiencyChoice"
	| "spellSelection"
	| "inventory"
	| "loreForm";

/** Champ commun à toutes les étapes. */
type CreationStepBase = {
	/** Identifiant stable de l'étape (clé i18n, navigation). */
	key: string;
	/** Position dans le parcours. */
	order: number;
	/** Étape conditionnelle : nom d'un prédicat évalué côté front (ex. a une classe lanceuse). */
	condition?: string;
};

/** Étape « choisir N éléments dans une collection de contenu ». */
export type SelectionStep = CreationStepBase & {
	kind: "selection";
	config: {
		/** Collection ciblée (ex. `race`, `classe`, `background`, `type`...). */
		collectionKey: string;
		/** Nombre min/max d'éléments à choisir. */
		min: number;
		max: number;
		/** Affichage 2 colonnes avec portrait + lore + grants. */
		layout?: "cards-2col" | "list";
		showPortrait?: boolean;
		showGrants?: boolean;
	};
};

/** Étape « ajouter plusieurs entrées d'une collection » (multiclassage). */
export type RepeatableSelectionStep = CreationStepBase & {
	kind: "repeatableSelection";
	config: {
		collectionKey: string;
		/** Nombre maximum d'entrées (ex. nb de classes). */
		maxEntries: number;
		/** Champ scalaire saisi par entrée (ex. `level`). */
		entryField?: "level";
	};
};

/** Étape « répartir des points sur un ensemble d'attributs ». */
export type PointAllocationStep = CreationStepBase & {
	kind: "pointAllocation";
	config: {
		/** Clés des attributs concernés (ex. les 6 caractéristiques). */
		attributes: string[];
		/** Méthodes autorisées. */
		methods: AbilityScoreMethod[];
		/** Valeurs du standard array, si proposé. */
		standardArray?: number[];
		/** Réserve de points (point buy). */
		pointBuyPool?: number;
		/** Bornes des scores avant bonus. */
		minScore?: number;
		maxScore?: number;
	};
};

/** Étape « déterminer les points de vie » (lancer les dés ou moyenne fixe). */
export type HitPointsStep = CreationStepBase & {
	kind: "hitPoints";
	config: {
		/** Méthodes de calcul autorisées. */
		methods: HitPointsMethod[];
		/** Clé de propriété recevant les PV (ex. `hp`). */
		hpKey?: string;
		/** Clé de propriété recevant les dés de vie (ex. `des_de_vie`). */
		hitDiceKey?: string;
	};
};

/** Étape « choisir N maîtrises parmi une liste ». */
export type ProficiencyChoiceStep = CreationStepBase & {
	kind: "proficiencyChoice";
	config: {
		/** Clés des propriétés de maîtrise (boolean) candidates. */
		from: string[];
		count: number;
	};
};

/** Étape de sélection de sorts (conditionnelle aux classes lanceuses). */
export type SpellSelectionStep = CreationStepBase & {
	kind: "spellSelection";
	config: {
		collectionKey: string;
	};
};

/** Étape inventaire + monnaie. */
export type InventoryStep = CreationStepBase & {
	kind: "inventory";
	config: {
		collectionKey: string;
		/** Clé de propriété pour la monnaie de départ (ex. `gold`). */
		currencyKey?: string;
	};
};

/** Étape lore (texte libre + portrait). */
export type LoreFormStep = CreationStepBase & {
	kind: "loreForm";
	config: {
		/** Clés de propriétés textuelles éditées (apparence, histoire...). */
		fields: string[];
	};
};

/** Une étape du parcours de création (union discriminée par `kind`). */
export type CreationStep =
	| SelectionStep
	| RepeatableSelectionStep
	| PointAllocationStep
	| HitPointsStep
	| ProficiencyChoiceStep
	| SpellSelectionStep
	| InventoryStep
	| LoreFormStep;

/** Parcours de création complet d'un système. */
export type CreationFlow = {
	gameSystemSlug: string;
	steps: CreationStep[];
};

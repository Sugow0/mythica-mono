/**
 * Parcours de création D&D 5e (2014), data-driven. Chaque étape devient une ligne
 * `GameSystemCreationStep` (kind + config JSONB). Le front rend les étapes
 * génériquement par `kind` — aucun code D&D côté front.
 *
 * Ordre : race → classe → niveau/multiclassage → background + caractéristiques +
 * maîtrises → sorts (conditionnel) → inventaire/or → lore.
 */

/** Une étape de création prête à seeder (config = JSON libre selon le kind). */
export type CreationStepSeed = {
	stepKey: string;
	order: number;
	kind:
		| "selection"
		| "repeatableSelection"
		| "pointAllocation"
		| "hitPoints"
		| "abilityImprovement"
		| "proficiencyChoice"
		| "spellSelection"
		| "inventory"
		| "loreForm";
	config: Record<string, unknown>;
	/** Prédicat évalué côté front pour les étapes conditionnelles. */
	condition?: string;
};

/** Clés de propriétés lore (textarea) éditées à la dernière étape. */
export const DND5E_LORE_FIELDS = [
	"apparence",
	"biographie",
	"personnalite",
	"liens",
	"ideaux",
	"defauts",
];

/** Champs d'identité (alignement + physique) saisis pendant la création. */
export const DND5E_IDENTITY_FIELDS = [
	"alignement",
	"age",
	"taille",
	"poids",
	"yeux",
	"peau",
	"cheveux",
];

export const DND5E_CREATION_FLOW: CreationStepSeed[] = [
	{
		stepKey: "race",
		order: 0,
		kind: "selection",
		config: {
			collectionKey: "race",
			min: 1,
			max: 1,
			layout: "cards-2col",
			showPortrait: true,
			showGrants: true,
		},
	},
	{
		stepKey: "classe",
		order: 1,
		kind: "selection",
		config: {
			collectionKey: "classe",
			min: 1,
			max: 1,
			layout: "cards-2col",
			showPortrait: true,
			showGrants: true,
		},
	},
	{
		stepKey: "niveau",
		order: 2,
		kind: "repeatableSelection",
		config: {
			collectionKey: "classe",
			maxEntries: 3,
			entryField: "level",
			// Vérifie les prérequis de multiclassage côté front/back via character-engine.
			enforceMulticlassPrereq: true,
		},
	},
	{
		// Choisie juste après le niveau : certaines sous-classes influent sur les
		// maîtrises (Collège du Savoir : 3 compétences au choix), donc avant l'étape
		// « maîtrises ».
		stepKey: "sous-classe",
		order: 3,
		kind: "selection",
		config: { collectionKey: "sous-classe", min: 1, max: 1, showGrants: true },
		condition: "has_subclass_choice",
	},
	{
		stepKey: "background",
		order: 4,
		kind: "selection",
		config: {
			collectionKey: "background",
			min: 1,
			max: 1,
			layout: "list",
			showGrants: true,
		},
	},
	{
		stepKey: "caracteristiques",
		order: 5,
		kind: "pointAllocation",
		config: {
			attributes: [
				"force",
				"dexterite",
				"constitution",
				"intelligence",
				"sagesse",
				"charisme",
			],
			methods: ["standard_array", "point_buy", "dice_roll", "manual"],
			standardArray: [15, 14, 13, 12, 10, 8],
			pointBuyPool: 27,
			pointBuyCostTable: {
				8: 0,
				9: 1,
				10: 2,
				11: 3,
				12: 4,
				13: 5,
				14: 7,
				15: 9,
			},
			minScore: 8,
			maxScore: 15,
		},
	},
	{
		// Améliorations de caractéristiques / dons aux paliers d'ASI (par classe).
		// Conditionnelle : visible seulement si le personnage a atteint un palier.
		stepKey: "ameliorations",
		order: 6,
		kind: "abilityImprovement",
		config: {
			attributes: [
				"force",
				"dexterite",
				"constitution",
				"intelligence",
				"sagesse",
				"charisme",
			],
			collectionKey: "don",
			maxScore: 20,
		},
		condition: "has_ability_improvement",
	},
	{
		stepKey: "points-de-vie",
		order: 7,
		kind: "hitPoints",
		config: {
			// Lancer les dés ou prendre la moyenne fixe ; niveau 1 = max du dé.
			methods: ["average", "roll"],
			hpKey: "hp",
			hitDiceKey: "des_de_vie",
		},
	},
	{
		stepKey: "maitrises",
		order: 8,
		kind: "proficiencyChoice",
		config: {
			// `from`/`count` résolus dynamiquement depuis la classe choisie
			// (skillChoices), la sous-classe et le background.
			source: "class-skills",
		},
	},
	{
		stepKey: "sorts",
		order: 9,
		kind: "spellSelection",
		config: { collectionKey: "sort" },
		condition: "has_caster_class",
	},
	{
		stepKey: "inventaire",
		order: 10,
		kind: "inventory",
		config: { collectionKey: "equipement", currencyKey: "gold" },
	},
	{
		stepKey: "identite",
		order: 11,
		kind: "loreForm",
		config: { fields: DND5E_IDENTITY_FIELDS },
	},
	{
		stepKey: "lore",
		order: 12,
		kind: "loreForm",
		config: { fields: DND5E_LORE_FIELDS },
	},
];
